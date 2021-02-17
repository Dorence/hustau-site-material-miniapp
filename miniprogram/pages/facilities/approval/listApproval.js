// pages/approval/listApproval.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    apprList: [],
    examState: app.globalData.facExamStr,
    flagGet: -1
  },
  /**
   * onLoad()
   * 页面加载事件
   */
  onLoad(options) {
    // check url get
    if (this.getUrl(options) === false) {
      wx.showToast({
        title: "无效访问",
        icon: "none",
        mask: true,
        duration: 2000,
        complete() {
          setTimeout(() => {
            wx.navigateBack({
              delta: 1
            });
          }, 2050);
        }
      });
    } else {
      this.fetchFacData();
    }
  },
  /**
   * getUrl()
   * @param {Object} options 传入的get对象(options)
   */
  getUrl(options) {
    let filter = {};
    let x;

    // exam
    x = Number(options.flag);
    if (!isNaN(x) && x >= 0) filter.exam = x;

    // expire
    x = Number(options.expireSubmit);
    if (!isNaN(x)) {
      filter.exSubmit = x;
      this.setData({
        expire: x + "天"
      });
    } else {
      this.setData({
        expire: "所有时间"
      });
    }

    console.log("[getUrl]", filter);
    this.setData({
      filter: filter
    });
    return Object.keys(filter).length ? filter : false;
  },
  /**
   * 用户下拉动作刷新
   */
  onPullDownRefresh() {
    this.fetchFacData().then(wx.stopPullDownRefresh);
  },
  /**
   * fetchFacData()
   * 调用云函数获取场地借用审批
   */
  fetchFacData() {
    const that = this;
    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "getApprList",
        collection: app.globalData.dbFacFormCollection,
        filter: this.data.filter,
        operate: "read"
      }
    }).then(res => {
      console.log("[fetchFacData]res", res);
      if (res.result.err) {
        console.error(res.result.errMsg);
        return;
      }

      let x = res.result.data;
      if (Array.isArray(x)) {
        for (let i in x)
          x[i].eventDate = app._toDateStr(new Date(x[i].eventDate));
        that.setData({
          apprList: x,
          flagGet: x.length ? 1 : 0
        });
      } else {
        that.setData({
          apprList: [],
          flagGet: 0
        });
      }
      // console.log(that.data.apprList);
    }).catch(err => {
      console.error("[fetchFacData]failed", err);
    });
  }
})