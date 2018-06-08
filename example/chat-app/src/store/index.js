import Vue from 'vue';
import Vuex from 'vuex';

import me from './me';
import friend from './friend';
import log from './log';
import account from './account';
import stream from './stream';

const storeOpts = {
  modules: {
    me : me,
    log,
    friend,
    account,
    stream
  },
  state: {
  },
  mutations: {

  },
  actions: {
    carrier_data(context, param){
      try{
        context.commit(param.type, {
          data: param.data,
          context
        });

      }catch(e){
        console.error(e);
      }
    },

    reset(ctx){
      ctx.commit('account/reset');
      ctx.commit('reset');
    }
  }
};





let store = null;
export default {
  init(){
    Vue.use(Vuex);
    store = new Vuex.Store(storeOpts);

    return store;
  },
  getStore(){
    if(!store){
      this.init();
    }

    return store;
  }
}
