// app.js
const CFG = require("./config.js");

App({
  globalData: {
    rule: `
 1. 请至少提前两天准备好活动策划，在${CFG.appFullName}小程序上申请借用教室，并将策划电子版以“36号楼教室借用+协会名称+日期”的方式命名发送至办公室公邮${CFG.contactEmail}。审批情况可在小程序上查询，审批通过方可使用；

 2. 使用教室的当天须将手机上教室借用确认单给阿姨查看，并在36号楼教室借用登记表上进行借用登记；

 3. 建议申请前先查询教室是否空闲，查询方式: [场地借用]-[教室借用查询]；

 4. 房间钥匙请找阿姨取用，教室使用结束后请将门锁好，把钥匙交给阿姨并在36号楼教室借用登记表上签离；

 5. 普通教室须有活动负责人陪同使用并保证器材设备完好，活动结束后请将教室清理干净、桌椅归位，如发现教室卫生及器材损坏问题将影响未来二次借用，谢谢配合；

 6. 如有任何疑问，请联系36号楼教室借用负责人杨景文: 18022387956。
    `
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      wx.showToast({
        title: "请升级微信以使用小程序",
        icon: "none",
        duration: 10000
      });
      return;
    }

    wx.cloud.init({
      env: CFG.cloudEnv,
      traceUser: true,
    });
    console.log("[cloud] init");

    this._storage = require("./assets/storage.js");
    for (let item in CFG)
      this.globalData[item] = CFG[item];
  },

  /**
   * 返回填充至指定长度的字符串
   * @param {any} data 
   * @param {Number} len 
   * @param {String} padChar 填充的字符
   * @param {Boolean} fromEnd
   */
  _paddingString(data, len, padChar = "0", fromEnd = false) {
    data = data.toString();
    while (data.length < len) {
      if (fromEnd) data += padChar;
      else data = padChar + data;
    }
    return data;
  },

  /**
   * 将Date对象转为"Y-m-d"字符串.
   * @param {Date} date 需要转换的日期对象
   * @param {Boolean} leadingZeros=false 是否有前导0
   * @return {String} "Y-m-d"格式字符串
   */
  _toDateStr(date, leadingZeros = false) {
    if (!date instanceof Date)
      return "";
    let str = date.getFullYear() + "-";
    if (leadingZeros) {
      str += this._paddingString(date.getMonth() + 1, 2) + "-" + this._paddingString(date.getDate(), 2);
    } else {
      str += (date.getMonth() + 1) + "-" + date.getDate();
    }
    return str;
  },

  /**
   * 将Date对象转为"Y-m-d h:M"字符串.
   * @param {Date} date 
   * @param {Boolean} leadingZeros 
   */
  _toMinuteStr(date, leadingZeros = false) {
    if (!date instanceof Date)
      return "";
    let str = this._toDateStr(date, leadingZeros) + " ";
    if (leadingZeros) {
      str += this._paddingString(date.getHours(), 2);
    } else {
      str += date.getHours();
    }
    str += ":" + this._paddingString(date.getMinutes(), 2);
    return str;
  },

  /**
   * 判断 n 是否为有限大 Number
   * @param {any} n 
   */
  _isNumeric(n) {
    return typeof n === "number" && !isNaN(n) && isFinite(n);
  },

  /**
   * 返回距 date 有 offset 天的 Date 实例
   * @param {Date|String|Number} date Date对象|时间字符串|时间戳
   * @param {Number} offset 偏移天数, 默认为 0
   */
  _dayOffset(date, offset = 0) {
    if (!this._isNumeric(offset)) {
      console.error("[_dayOffset]offset is not a number", offset);
      return false;
    }
    let d = new Date(date);
    d.setDate(d.getDate() + offset);
    return d;
  },

  /**
   * 判断是否是 ID String
   * @param {String} str - 待判断的字符串
   * @param {Number[]} lenArr - ID String可能的长度
   * @return {Boolean} 是否是长度为 lenArr 中任意一个的ID String
   */
  _isIDString(str, lenArr) {
    if (typeof str !== "string") return false;
    if (!Array.isArray(lenArr)) return false;
    for (let i = 0; i < lenArr.length; i++) {
      if ((new RegExp("[0-9A-Za-z_-]{" + lenArr[i] + "}")).test(str))
        return true;
    }
    return false;
  },

  /**
   * 长按复制
   * @param {Object} e event handler
   */
  _longPressCopy(e) {
    const v = e.currentTarget.dataset.copy;
    console.log("[longPressCopy]", v);
    wx.setClipboardData({
      data: v,
      success() {
        wx.showToast({
          title: "复制成功"
        });
      }
    });
  }
})