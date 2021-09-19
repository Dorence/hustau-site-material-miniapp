// pages/materials/borrow/return.js
const app = getApp();
const db = wx.cloud.database();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    date: app._toDateStr(new Date(), true),
    startDate: app._toDateStr(new Date(), true),
    endDate: (() => {
      let d = new Date();
      d.setDate(d.getDate() + 1);
      return app._toDateStr(d, true);
    })(),
    retItem: {},

    contentLength: 0,
    maxContentLength: 300
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(options);
    if (!options.id) return;

    db.collection(app.globalData.dbMatBorrowCollection).where({
      _id: options.id
    }).get().then(e => {
      // console.log(e);
      if (e.data) {
        let item = e.data[0];
        let startDate = item.eventDate1;
        if (startDate > this.data.date)
          startDate = this.data.date;
        this.setData({
          startDate: startDate,
          retItem: item
        });
      }
    });
  },

  /**
   * 在线填表页面点击提交的函数
   */
  submit(e) {
    const form = e.detail.value;
    console.log("[form]", form);

    form.returnQuantity = Number(form.returnQuantity);
    if (isNaN(form.returnQuantity) || form.returnQuantity < 0 || form.returnQuantity > this.data.retItem.quantity) {
      wx.showModal({
        title: "错误",
        content: "请核对归还数量",
        showCancel: false,
        confirmText: "再去改改"
      });
      return false;
    }

    db.collection(app.globalData.dbMatBorrowCollection).doc(this.data.retItem._id)
      .update({
        data: {
          returnQuantity: form.returnQuantity,
          returnStatus: form.returnStatus,
          returnDate: form.returnDate,
          exam: 5
        }
      }).then(e => {
        wx.showModal({
          title: "提交成功",
          content: "已提交归还申请，请关注后续审批结果",
          success: res => {
            if (res.confirm)
              wx.navigateBack({
                delta: 1
              });
          }
        });
      })
      .catch(console.error)
  },

  bindDateChange(e) {
    this.setData({
      date: e.detail.value
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
  }
})