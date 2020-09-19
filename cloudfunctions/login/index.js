/**
 * @file cloud function - login
 */

const cloud = require("wx-server-sdk");
/**
 * initialize cloud
 * @function initialize
 */
cloud.init({
  // env: "cloud-miniapp-96177b",
  env: "release-824dd3",
  traceUser: true
});

/**
 * 将经自动鉴权过的小程序用户 openid 返回给小程序端,
 * 若取得的数据多于一条, 则以 data[0] 为准
 */
exports.main = async(event, context) => {
  // console.log(event, context);
  /**
   * 获取 WXContext (微信调用上下文), 包括 OPENID, APPID, UNIONID(需满足获取条件)
   * @function getWXContext
   */
  const wxContext = cloud.getWXContext();
  /**
   * @returns {string} openid
   */
  return await cloud.database().collection("adminInfo").where({
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
     * 判断用户身份:isAdmin\isSuper
     * 添加到ret:name, isSuper, (userlist)
     * @function user judge
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
  /**
   * 报错
   * @returns {object} error(true, message)
   */
  ).catch(err => {
    return {
      err: true,
      errMsg: err
    }
  });
}