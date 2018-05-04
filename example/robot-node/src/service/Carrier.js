import SDK from 'elastos_carrier_addon';
import _ from 'lodash';
import md5 from 'md5';
import Robot from './Robot';

const connection_name = [
    "online",
    "offline"
];

const presence_name = [
    "none",    // None;
    "away",    // Away;
    "busy",    // Busy;
];

const bootstraps = [
    { ipv4: "13.58.208.50",     port: "33445",  publicKey: "89vny8MrKdDKs7Uta9RdVmspPjnRMdwMmaiEW27pZ7gh"},
    { ipv4: "18.216.102.47",    port: "33445",  publicKey: "G5z8MqiNDFTadFUPfMdYsYtkUDbX5mNCMVHMZtsCnFeb"},
    { ipv4: "18.216.6.197",     port: "33445",  publicKey: "H8sqhRrQuJZ6iLtP2wanxt4LzdNrN2NNFnpPdq1uJ9n2"},
    { ipv4: "54.223.36.193",    port: "33445",  publicKey: "5tuHgK1Q4CYf4K5PutsEPK5E3Z7cbtEBdx7LwmdzqXHL"},
    { ipv4: "52.80.187.125",    port: "33445",  publicKey: "3khtxZo89SBScAMaHhTvD68pPHiKxgZT6hTCSZZVgNEm"}
];


class Carrier {
    constructor(id){
        this.init(id);
    }
    init(id){
        if(!id){
            throw new Error('invalid carrier id');
        }

        this._data = {
            online : false,
            info : {
                name : 'Carrier Robot',
                email : 'rebot@carrier.net',
                region : 'China',
                phone : '123',
                gender : 'female',
                description : 'aaa'
            },
        };

        this.id = md5(id);

        const opts = {
            udpEnabled: true,
            persistentLocation: ".data/"+this.id,
            bootstraps: bootstraps
        };

        console.log('create carrier service with id = '+id);

        this.callbacks = this.buildCallback();
        this.carrier = SDK.createObject(opts, this.callbacks);
        this.carrier.run();
console.log(this.self_address());
        this.carrier.setSelfInfo(_.extend({
            userId : this.self_nodeid()
        }, this._data.info));


        this.robot = Robot.create();
    }

    log(info){
        console.log(info);
    }

    toClient(type, data){

    }

    buildCallback(){
        return {
            idle: ()=>{

            },
            connectionStatus: (carrier, status, context)=>{
                switch (status) {
                    case SDK.ConnectionStatus_Connected:
                        this.log("Connected to carrier network.");
                        this._data.online = true;

                        _.delay(()=>{
                            console.log(this.self_info());
                        }, 1000);



                        break;

                    case SDK.ConnectionStatus_Disconnected:
                        this.log("Disconnect from carrier network.");

                        break;

                    default:
                        this.log("Error!!! Got unknown connection status :" + status);
                }
            },
            friendsList: (carrier, friend_info, context)=>{
                try{
                    if(friend_info){

                    }
                    else {

                    }
                    return true;
                }catch(e){
                    console.error(e);
                }

            },
            friendConnection: (carrier, friendid,  status, context)=>{
                switch (status) {
                    case SDK.ConnectionStatus_Connected:
                        console.log("Friend [" + friendid +"] connection changed to be online");

                        //TOOD why call this.info_friend(friendid) here will throw an error.

                        this.toClient('friend/status/callback', {
                            userId : friendid,
                            status : 0,
                            online : true
                        });
                        break;

                    case SDK.ConnectionStatus_Disconnected:
                        console.log("Friend [" + friendid +"] connection changed to be offline.");
                        this.toClient('friend/status/callback', {
                            userId : friendid,
                            status : 1,
                            online : false
                        });
                        break;

                    default:
                        this.log("Error!!! Got unknown connection status:" + status);
                }
                return true;
            },
            friendInfo: (carrier, friendId, info, context)=>{
                console.log("Friend information changed: "+friendId);

            },
            friendPresence: (carrier, friendid,  status, context)=>{
                if (status >= SDK.PresenceStatus_None &&
                    status <= SDK.PresenceStatus_Busy) {
                    this.log("Friend[" + friendid + "] change presence to " + presence_name[status]);
                }
                else {
                    this.log("Error!!! Got unknown presence status %d.", status);
                }
            },
            friendRequest: (carrier, userid, info, hello, context)=>{
                console.log("Friend request from user[" + info.userId + "] with : " + hello + ".");

                if(hello === process.env.CARRIER_REQUEST_SECRET.toLowerCase()){
                    try{
                        _.delay(()=>{
                            this.carrier.acceptFriend(info.userId);

                            _.delay(()=>{
                                this.send_message(info.userId, 'Hello');
                            }, 2000)
                        }, 2000);
                    }catch(e){
                        console.error(e);
                    }
                }

            },
            friendAdded: (carrier, info, context)=>{
                this.log("New friend added. The friend information:");

            },
            friendRemoved: (carrier, friend_id, context)=>{
                console.log("Friend " + friend_id +  " removed!");

                this.toClient('friend/remove/callback', friend_id);
            },
            friendMessage: (carrier, from, msg, context)=>{
                console.log("Message from friend[" + from + "]: " + msg);

                try{
                    this.robot.request(msg, {
                        userId : from,
                        callback : (rs)=>{
                            this.send_message(from, rs);
                        }
                    });

                }catch(e){
                    console.error(e);
                }
            },
            friendInvite: (carrier, from, msg, context)=>{
                this.log("Message from friend[" + from + "]: " + msg);
            }
        };
    }


    self_info(){
        const me = this.carrier.getSelfInfo();
        return {
            userId : me.userId,
            name : me.name,
            gender : me.gender,
            region : me.region,
            email : me.email,
            phone : me.phone
        };
    }
    self_presence(status=''){
        let presence;
        if(!status) {
            presence = this.carrier.getSelfPresence();
            return presence_name[presence];
        }
        else if (status) {
            if (status === "none") {
                presence = SDK.PresenceStatus_None;
            }
            else if (status === "away") {
                presence = SDK.PresenceStatus_Away;
            }
            else if (status === "busy") {
                presence = SDK.PresenceStatus_Busy;
            }
            else {
                throw ("Invalid command syntax.");
            }

            if (this.carrier.setSelfPresence(presence)) {
                return true;
            }
            else {
                throw ("Set user's presence failed (0x" + SDK.getError().toString(16) + ").");
            }
        }
        else {
            throw("Invalid command syntax.");
        }
    }
    self_address(){
        return this.carrier.getAddress();
    }

    self_nodeid(){
        return this.carrier.getNodeId();
    }

    self_userid(){
        return this.carrier.getUserId();
    }
    add_friend(address, msg){
        if(this.carrier.addFriend(address, msg)){
            return true;
        }
        else{
            // TODO fix getError is not defined
            // if added, return ela_add_friend error:0x8100000C error
            throw new Error(address + ' was added, please wait for response');
        }
    }

    info_friend(userid){
        if(!userid){
            throw new Error('invalid userid for show_friend');
        }

        const info = this.carrier.getFriendInfo(userid);
        if (!info) {
            throw ("Get friend information failed(0x" +  SDK.getError().toString(16) + ").");
        }

        const fi = new FriendClass(info);
        return fi.getData();
    }

    list_friend(){
        this.carrier.getFriends(this.callbacks.friendsList, null);
    }

    send_message(userid, msg){
        const rs = this.carrier.sendFriendMessage(userid, msg);
        if(rs){
            return true;
        }
        else
            throw ("Send message failed(0x" +  SDK.getError().toString(16) + ").");
    }

    accept_friend(userid){
        const rs = this.carrier.acceptFriend(userid);
        if(rs){
            return true;
        }
        else{
            throw ("Accept friend request failed(0x" +  SDK.getError().toString(16) + ").");
        }
    }

    remove_friend(userid) {
        const rs = this.carrier.removeFriend(userid);
        if(rs){
            return true;
        }
        else{
            throw ("Remove friend %s failed (0x" + SDK.getError().toString(16) + ").");
        }
    }

    close(){
        this.carrier.destory();
    }
}
Carrier.instance = null;
Carrier.create = (id)=>{
    if(!Carrier.instance){
        Carrier.instance = new Carrier(id);
    }

    return Carrier.instance;
};

export default Carrier;