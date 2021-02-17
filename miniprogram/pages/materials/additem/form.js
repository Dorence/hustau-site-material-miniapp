// pages/addThings/add.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    category: app.globalData.matCategory.map(x => x.join("，")),
    genre: 0,
    locArr: app.globalData.matLocation,
    location: [0, 0, 0],

    adminState: -1,
    canSubmit: false,
    date: app._toDateStr(new Date(), true),
    isOriginalMat: true,

    contentLength: 0,
    maxContentLength: 200
  },

  /**
   * 物资类别改变
   */
  bindGenreChange(e) {
    console.log("[bindGenreChange]", e.detail.value)
    this.setData({
      genre: e.detail.value
    });
  },

  /**
   * 物资位置变化
   */
  bindLocationChange(e) {
    console.log("[bindLocationChange]", e.detail.value);
    this.setData({
      location: e.detail.value
    });
  },

  /**
   * 新增时间改变
   */
  bindDateChange(e) {
    console.log("[bindDateChange]", e.detail.value);
    this.setData({
      date: e.detail.value
    });
  },

  /**
   * 原有物资开关改变
   */
  bindSwitchChange(e) {
    console.log("[bindSwitchChange]", e.detail.value);
    this.setData({
      isOriginalMat: e.detail.value,
      _id: "", // erase prev data
      itemName: "",
      genre: 0,
      location: [0, 0, 0],
      canSubmit: !e.detail.value // 新增物资时可以提交表单
    });
  },

  /**
   * 输入活动内容时的响应, 显示字数
   * @param {Object} e 传入的事件, e.detail.value为文本表单的内容
   */
  contentInput(e) {
    this.setData({
      contentLength: e.detail.value.length
    })
  },

  //校验Forms
  toFormObject(form) {
    const p = this.data;
    if (this.data.isOriginalMat && !p._id) return {
      err: "请选择原有物资"
    };

    // trim and judge
    let trimArr = [
      ["association", "单位名称"],
      ["responser", "负责人姓名"],
      ["studentId", "学号"],
    ];

    if (!this.data.isOriginalMat) {
      trimArr.push(["itemName", "新增物资名称"]);
    }

    for (let it of trimArr) {
      form[it[0]] = form[it[0]].trim();
      if (!form[it[0]]) return {
        err: "请填写" + it[1]
      };
    }
    // end trim and judge

    form.addQuantity = Number(form.addQuantity);
    if (isNaN(form.addQuantity) || form.addQuantity < 0)
      return {
        err: "请正确填写新增物资数量"
      };

    if (!(/^\d{11}$/.test(form.phone))) return {
      err: "请填写正确的手机号"
    };


    let ret = {
      isOriginalMat: this.data.isOriginalMat,
      info: {
        association: form.association,
        comment: form.comment,
        name: form.responser,
        phone: form.phone,
        studentId: form.studentId
      },
      itemDoc: this.data._id,
      eventDate: form.eventDate,
      quantity: form.addQuantity,

      exam: 0,
      _openid: app.loginState.openid
    }

    if (this.data.isOriginalMat) {
      ret.itemName = this.data.itemName;
      ret.itemId = this.data.itemId;
    } else {
      ret.itemName = form.itemName;
      ret.genre = Number(form.genre);
      ret.location = form.location;
    }

    return ret;
  },

  /**
   * 在线填表页面点击提交的函数
   */
  submit(e) {
    const PAGE = this;
    const value = e.detail.value;
    console.log("[submit]", value);

    let formObj = this.toFormObject(value);
    // has error
    if (formObj.hasOwnProperty("err")) {
      wx.showModal({
        title: "提交失败",
        content: formObj.err,
        showCancel: false,
        confirmText: "再去改改"
      });
      return;
    }

    console.log("[formObj]", formObj);

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
      caller: "newAddItem",
      collection: app.globalData.dbMatAddItemCollection,
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
      if (res.result.err) {
        console.error(res.result.errMsg);
        this.setData({
          canSubmit: true
        });
        wx.showToast({
          title: "发生错误，请稍后重试",
          icon: "none",
          duration: 3000,
          mask: true
        })
        return;
      }
      console.log("[submitAppr] Success", res);
      wx.hideLoading();
      wx.showModal({
        title: "提交成功",
        content: "请妥善保留发票，按流程报销",
        showCancel: false,
        success() {
          wx.navigateBack({
            delta: 1
          });
        }
      });
    }).catch(err => {
      console.error("[submitAppr] failed", err);
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log("[onLoad]", options);
    this.setData(options);
  }
})