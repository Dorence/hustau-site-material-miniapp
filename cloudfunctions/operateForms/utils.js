(function () {
  "use strict";
  let U = {};
  U.dateReg = /^2\d{3}-(0\d|1[0-2])-([0-2]\d|3[01])$/;
  U.maxExamNumber = 7;

  U.isArray = (obj) => {
    return Array.isArray(obj);
  };

  U.isString = (str) => {
    return typeof str === "string";
  }

  /**
   * 判断是否是 ID String
   * @param {String} str - 待判断的字符串
   * @param {Number[]} lenArr - ID String可能的长度
   * @return {Boolean} 是否是长度为 lenArr 中任意一个的ID String
   */
  U.isIDString = (str, lenArr) => {
    if (!U.isString(str) || !U.isArray(lenArr)) return false;
    for (let i = 0; i < lenArr.length; i++) {
      if ((new RegExp("[0-9A-Za-z_-]{" + lenArr[i] + "}")).test(str)) return true;
    }
    return false;
  };

  U.isDateString = (str) => {
    return U.isString(str) && U.dateReg.test(str);
  };

  /**
   * 获取距今天 day 天之前那天的 Date 实例
   * @param {Number} day - 需得到的那天与今天隔的天数(负数表示未来的某天)
   * @return {Date} 得到的 Date 对象实例
   */
  U.lastDay = (day) => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  };

  /**
   * 判断一个数字是否在[0, maxExamNumber)范围内
   * @param {Number} num - 待判断内容
   * @return {Boolean} 是否是数字对象且在指定范围内
   */
  U.isExamNum = (num) => {
    return !isNaN(num) && (num >= 0) && (num < U.maxExamNumber);
  }

  /** error msg */
  U.EMsg = function (msg = "") {
    this.err = true;
    this.errMsg = msg;
  };

  U.EMsg.prototype.append = function (key, value) {
    this[key] = value;
    return this;
  }

  /**
   * 返回填充至指定长度的字符串
   * @param {any} data 
   * @param {Number} len 
   * @param {String} padChar 填充的字符
   * @param {Boolean} fromEnd
   */
  U.paddingString = (data, len, padChar = "0", fromEnd = false) => {
    data = data.toString();
    while (data.length < len) {
      if (fromEnd) data += padChar;
      else data = padChar + data;
    }
    return data;
  };

  /**
   * yyyySxnnnnn
   * yyyy = 年份, 对应学期（1,2月算前一年）
   * Sx = S1 | S2, S1=Spring, S2=Fall
   * nnnnn = 编号, 起始 00001
   * @param {String} formid 此前的 formid
   */
  U.genFormid = (formid) => {
    formid = formid.toString();
    let prefix;
    let t = new Date();
    // @note getMonth() => 0:Jan, 1:Feb, ... , 11:Dec
    switch (t.getMonth()) {
      case 0: // Jan
        prefix = `${t.getFullYear() - 1}S2`;
        break;
      case 1: // Feb
        if (t.getDate() <= 14) prefix = `${t.getFullYear() - 1}S2`;
        else prefix = `${t.getFullYear()}S1`;
        break;
      case 2: // Mar
      case 3: // Apr
      case 4: // May
      case 5: // Jun
      case 6: // Jul
        prefix = `${t.getFullYear()}S1`;
        break;
      case 7: // Aug
      case 8: // Sep
      case 9: // Oct
      case 10: // Nov
      case 11: // Dec
        prefix = `${t.getFullYear()}S2`;
        break;
      default:
        prefix = `${t.getFullYear()}XX`;
        console.error("Invalid month", t, t.getMonth());
    }

    let newFormNum = 1;
    if (formid.substring(0, 6) === prefix)
      newFormNum = Number(formid.substring(6)) + 1;
    let newID = prefix + U.paddingString(newFormNum, 5);

    console.log("[Previous formid]", formid, "[newID]", newID);
    return newID;
  }

  module.exports = U;
})(this);