// pages/materials/borrow/form.js
const app = getApp();
const db = wx.cloud.database();
const today = app._toDateStr(new Date(), true);

/**
 * dayOffset
 * @param {Date} date 
 * @param {Number} n 
 */
function dayOffset(date, n) {
  let d = new Date(date);
  d.setDate(date.getDate() + n)
  return d;
}

Page({
  data: {
    date1: today, // 借用开始时间
    date2: today, // 借用结束时间
    validEndDay: app._toDateStr(dayOffset(new Date(), 14), true),

    adminState: -1, // disable select admin
    canSubmit: false
  },

  onLoad(options) {
    this.setData(options);
    this.setData({
      canSubmit: true
    });
  },

  /**
   * 借用时间改变
   */
  bindDateChange1(e) {
    const date1 = e.detail.value;
    let date2 = this.data.date2;
    if (date2 < date1)
      date2 = date1;
    this.setData({
      date1: date1,
      date2: date2,
      validEndDay: app._toDateStr(dayOffset(new Date(date1), 14), true)
    });
  },

  /**
   * 归还时间改变
   */
  bindDateChange2(e) {
    const date1 = this.data.date1;
    let date2 = e.detail.value;
    if (date2 < date1)
      date2 = date1;
    this.setData({
      date2: date2
    });
  },

  /**
   * 校验数据并生成对应的数据库对象
   * @param {Object} data submit时表单的数据
   */
  toFormObject(data) {
    // trim and judge
    const trimArr = [
      ["association", "单位名称"],
      ["name", "借用人姓名"],
      ["class", "院系班级"],
      ["studentId", "学号"],
      ["description", "借用用途"]
    ];
    for (let i = 0; i < trimArr.length; i++) {
      data[trimArr[i][0]] = data[trimArr[i][0]].trim();
      if (!data[trimArr[i][0]])
        return {
          err: "请填写" + trimArr[i][1]
        };
    }
    // end trim and judge

    data.quantity = Number(data.quantity);
    if (!data.quantity || data.quantity <= 0 || data.quantity > this.data.quantity)
      return {
        err: "借用数量有误，剩余：" + this.data.quantity
      };

    if (!/^\d{11}$/.test(data.phone))
      return {
        err: "请填写正确的手机号"
      };

    return {
      eventDate1: data.eventDate1,
      eventDate2: data.eventDate2,
      exam: 0,
      info: {
        association: data.association,
        class: data.class,
        description: data.description,
        name: data.name,
        studentId: data.studentId,
        phone: data.phone
      },
      itemDoc: this.data._id,
      itemId: this.data.itemId,
      itemName: this.data.itemName,
      quantity: data.quantity,
      _openid: app.loginState.openid
    };
  },

  /**
   * Submit the form.
   * @param {Object} e event
   */
  submit(e) {
    const data = e.detail.value;
    // const that = this;
    console.log("[submit]", data);

    let formObj = this.toFormObject(data);
    console.log("[formObj]", formObj);

    // has error
    if (formObj.hasOwnProperty("err")) {
      wx.showModal({
        title: "提交失败",
        content: formObj.err,
        showCancel: false,
        confirmText: "再去改改"
      });
      return false;
    }

    /** @todo subscribe message */

    // 提交申请表单
    this.submitAppr(formObj);
  },

  /**
   * Submit approval by calling cloud function
   * @param {Object} formObj 
   */
  submitAppr(formObj) {
    // add a mask to prevent multiple submissions
    wx.showLoading({
      mask: true,
      title: "提交中..."
    });
    this.setData({
      canSubmit: false
    });

    let data = {
      caller: "newBorrowMat",
      collection: app.globalData.dbMatBorrowCollection,
      add: formObj,
      operate: "add"
    };

    if (this.data.adminState > 0) {
      data.extrainfo = {
        adminOpenid: this.data.adminList[this.data.adminIndex].openid
      };
    }

    return wx.cloud.callFunction({
      name: "operateForms",
      data: data
    }).then(res => {
      console.log("[submitAppr]Success", res);
      wx.hideLoading();
      wx.showToast({
        title: "提交成功",
        success() {
          setTimeout(() => {
            wx.navigateBack({
              delta: 2 // back to index
            });
          }, 2000);
        }
      });
    }).catch(err => {
      console.error("[submitAppr]failed", err);
    });
  }
})