// miniprogram/pages/materials/returnThings.js
const app = getApp();
const db = wx.cloud.database();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    date: app._toDateStr(new Date(), true),
    endDate: (() => {
      let d = new Date();
      d.setDate(d.getDate() + 1);
      return app._toDateStr(d, true);
    })(),
    retItem: {},
    maxContentLength: 300,
    contentLength: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(options);
    if (!options.id) {
      return;
    }

    db.collection("formsForMaterials").where({
      _id: options.id
    }).get().then((e) => {
      // console.log(e);
      if (e.data)
        this.setData({
          retItem: e.data[0] || []
        });
      console.log("data", this.data);
    });

  },

  /**
   * 在线填表页面点击提交的函数
   */
  submit: function (e) {
    const formsData = e.detail.value;
    console.log("[formsData]", formsData);
    db.collection("formsForMaterials").doc(this.data.retItem._id).update({
        data: {
          // 表示将 done 字段置为 true
          returnQuantity: formsData.returnQuantity,
          returnStatus: formsData.returnStatus,
          returnTime: formsData.returnTime,
          exam: 4
        }
      }).then((e) => {
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

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  /**
   * contentInput()
   * 输入活动内容时的响应, 显示字数
   * @param {Object} e 传入的事件, e.detail.value为文本表单的内容
   */
  contentInput: function (e) {
    this.setData({
      contentLength: e.detail.value.length
    })
  }
})