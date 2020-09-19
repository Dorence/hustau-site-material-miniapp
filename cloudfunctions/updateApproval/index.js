// 云函数入口文件
const cloud = require("wx-server-sdk");
/**
 * initialize cloud
 * @method initialize
 */
cloud.init({
  // env: "cloud-miniapp-96177b",
  env: "release-824dd3",
  traceUser: true
});

/**
 * 查找一个对象是否有某个属性
 * @param {object} check 
 * @param {number} examFlag 
 * @param {string} comment
 * @function regObj
 */
function regObj(check, examFlag) {
  let o = {
    openid: cloud.getWXContext().OPENID
  };
  if (check) {
    if (check.hasOwnProperty("approver")) o.approver = check.approver;
    if (check.hasOwnProperty("comment")) o.comment = check.comment;
  }
  return {
    check: o,
    exam: examFlag
  };
}

// 云函数入口函数
exports.main = async(event, context) => {
  console.log("event", event);
  /**
   * typeof 判断数据类型，输出event.updateID的类型
   * @method typeof
   * @funcion isString
   * @returns {object} error
   */
  if (typeof event.updateID !== "string" || !(/[0-9A-Za-z_-]{16}/.test(event.updateID))) {
    return {
      error: true,
      msg: "error updateID."
    };
  }
  /**
   * 检查event.check
   * object.keys 处理对象：返回属性数组；处理数组、字符串：返回索引数组
   * @param {object} event.check - 'approver','exam','openid','time'
   * @method object.keys
   * @function isObject
   * @returns {object} error
   */
  if (typeof event.check !== "object" || Object.keys(event.check).length === 0) {
    return {
      error: true,
      msg: "empty data input."
    }
  }

  /**
   * 判断event.exam是否为符合条件的数字
   * @param {number} flag - 将event.exam转化为数字（整数、小数）或NaN
   * @function isNumber
   */
  const flag = Number(event.exam);
  if (isNaN(flag) || flag < 0 || flag > 4) {
    return {
      error: true,
      msg: "error exam flag."
    }
  }
  const wxContext = cloud.getWXContext();
  const db = cloud.database();

  const value = await db.collection("forms").doc(event.updateID).update({
    data: regObj(event.check, flag)
  }).then((res) => {
    console.log("DONE");
    return {
      error: false,
      msg: res.errMsg,
      updated: res.stats.updated
    }
  });
  return value;
}