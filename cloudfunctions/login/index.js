/**
 * @file cloud function - login
 */
const CFG = require("./config.js");
const cloud = require("wx-server-sdk");
/**
 * initialize cloud
 * @function initialize
 */
cloud.init({
  env: CFG.cloudEnv,
  traceUser: true
});

/**
 * 将经自动鉴权过的小程序用户 openid 返回给小程序端,
 * 若取得的数据多于一条, 则以 data[0] 为准
 */
exports.main = async (event, context) => {
  // console.log(event, context);
  /**
   * 获取 WXContext (微信调用上下文), 包括 OPENID, APPID, UNIONID(需满足获取条件)
   * @function getWXContext
   */
  const wxContext = cloud.getWXContext();
  /**
   * @returns {string} openid
   */
  return await cloud.database().collection(CFG.dbAdminCollection).where({
    openid: wxContext.OPENID
  }).get().then(r => {
      console.log("[result]", r);

      /**
       * get user's information:openid, unionid, isAdmin
       * @method get userInformation
       */
      let ret = {
        openid: wxContext.OPENID,
        unionid: wxContext.UNIONID,
        isAdmin: r.data.length && r.data[0].isAdmin
      };

      /**
       * 用户鉴权
       * isAdmin -> name, isSuper?
       * isSuper -> userlist (= tokens)
       */
      if (ret.isAdmin) {
        ret.name = r.data[0].name;
        ret.isSuper = r.data[0].isSuper;
        if (ret.isSuper) {
          ret.userList = r.data[0].tokens;
        }
      }
      /**
       * @returns {object} ret(用户信息)
       */
      return ret;
    }

  ).catch(err => {
    /**
     * 报错
     * @returns {object} error(true, message)
     */
    return {
      err: true,
      errMsg: err
    }
  });
}