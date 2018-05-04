import _ from 'lodash';
import vue from 'vue';
import {Message, Notification, cache} from '../utility';

const default_state = ()=>({
  list : [],
  list_flag : false,
  apply_list : [],
  message : {},
  unread_message : {
    total : 0
  },

  currentSelect : {}
});

export default {
  state : default_state(),

  mutations : {
    'friend/list/callback'(state, {data}){
      if(!state.list_flag){
        if(!data.end){
          state.list_flag = true;
          state.list = [data.info];
        }

      }
      else{
        if(data.end){
          state.list_flag = false;
        }
        else{
          state.list.push(data.info);
        }
      }
    },
    'friend/list'(state, {data, context}){
      context.commit('add_log', '[friend/list] : ');
    },
    'friend/add'(state, {data, context}){
      context.commit('add_log', '[friend/add] : '+data.address);
    },
    'friend/apply/callback'(state, {data, context}){
      context.commit('add_log', `${data.userId} apply to be your friend with message "${data.msg}"`);

      state.apply_list.push(data);
    },
    'friend/accept'(state, {data, context}){
      context.commit('add_log', '[friend/accept] : ');
    },
    'friend/remove'(state, {data, context}){
      context.commit('add_log', '[friend/remove] : ');
    },
    'friend/remove/callback'(state, {data, context}){
      context.commit('friend.list.remove', {
        userId : data
      });
    },
    'friend/add/callback'(state, {data, context}){
      context.commit('add_log', 'New friend added. userId is '+data.userId);

    },
    'friend/info/callback'(state, {data, context}){
      context.commit('friend.info.update', data);
    },

    'friend/status/callback'(state, {data, context}){
      context.commit('friend.info.update', data);
    },

    'friend/message'(state){},
    'friend/message/callback'(state, {data, context}){
      context.commit('friend.message.add', {
        key : data.user.userId,
        from : data.user,
        msg : data.msg
      });

      context.commit('add_log', `receive message from ${data.user.userId} : ${data.msg}`);

      if(state.currentSelect.userId !== data.user.userId){
        if(!state.unread_message[data.user.userId]){
          state.unread_message[data.user.userId] = 0;
        }
        state.unread_message[data.user.userId] += 1;
        state.unread_message.total += 1;

        const tmp = _.clone(state.unread_message);
        vue.set(state, 'unread_message', tmp);
        Message.send('nw_app_badge', state.unread_message.total);
      }

      if(!cache('nw_focus') || state.currentSelect.userId !== data.user.userId){
        Notification.show(`${data.user.name || data.user.userId} : ${data.msg}`, {
          onclick : ()=>{
            context.commit('friend.current.set', data.user);
          }
        });
      }
    },

    'friend.apply_list.remove'(state, item){
      const list = _.clone(state.apply_list);
      _.remove(list, (d)=>d.userId===item.userId);
      state.apply_list = list;
    },
    'friend.list.remove'(state, item){
      const list = _.clone(state.list);
      _.remove(list, (d)=>d.userId===item.userId);
      state.list = list;
    },
    'friend.message.add'(state, item){
      const key = item.key;
      if(!state.message[key]){
        state.message[key] = [];
      }

      // notice here, need to set value to original state
      const list = _.clone(state.message);
      item.date = Date.now();
      list[key].push(item);

      vue.set(state, 'message', list);
    },

    'friend.current.set'(state, item){
      state.currentSelect = item;

      // surplus unread number
      if(state.unread_message[item.userId]){
        const n = state.unread_message[item.userId];
        state.unread_message.total -= n;
        state.unread_message[item.userId] = 0;

        const tmp = _.clone(state.unread_message);
        vue.set(state, 'unread_message', tmp);
        Message.send('nw_app_badge', state.unread_message.total);
      }
    },

    'friend.info.update'(state, data){
      const index = _.findIndex(state.list, (l)=>data.userId===l.userId);
      if(index !== -1){
        vue.set(state.list, index, _.extend({}, state.list[index], data));

        if(state.currentSelect.userId === data.userId){
          state.currentSelect = state.list[index];
        }
      }
    },




    reset(state){
      _.assign(state, default_state());
    }
  },

  getters : {
    getFriendMessageList : (state)=>()=>{
      const key = state.currentSelect.userId;
      return (key && state.message[key])? state.message[key] : [];
    }
  }
};
