// pages/approval/listApproval.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    apprList: [],
    examState: [],
    flagGet: -1
  },

  /**
   * 页面加载事件
   */
  onLoad(options) {
    // check url get
    if (this.getUrl(options) === false) {
      wx.showToast({
        title: "无效访问",
        icon: "none",
        mask: true,
        duration: 3000,
        complete() {
          setTimeout(() => {
            wx.navigateBack({
              delta: 1
            });
          }, 3050);
        }
      });
      return;
    }

    if (options.type === "borrow") {
      this.setData({
        examState: app.globalData.matExamStr
      });
      this.fetchMatData();
    } else if (options.type === "additem") {
      this.setData({
        examState: app.globalData.matExamAddStr
      });
      this.fetchMatAddItemData();
    } else {
      console.error("[onLoad] error type");
    }

  },
  /**
   * parse url options
   * @param {Object} options 传入的get对象(options)
   */
  getUrl(options) {
    let obj = {};

    // exam
    let x = Number(options.flag);
    if (!isNaN(x) && x >= 0) obj.exam = x;

    // expire
    x = Number(options.expireSubmit);
    if (!isNaN(x)) {
      obj.exSubmit = x;
      this.setData({
        expire: x + "天"
      });
    } else {
      this.setData({
        expire: "所有时间"
      });
    }
    console.log("[getUrl] filter", obj);
    this.setData({
      filter: obj,
      type: options.type
    });
    return Object.keys(obj).length > 0 ? obj : false;
  },

  /**
   * 用户下拉动作刷新
   */
  onPullDownRefresh() {
    switch (this.data.type) {
      case "borrow":
        this.fetchMatBorrowData().then(wx.stopPullDownRefresh);
        break;
      case "additem":
        this.fetchMatAddItemData().then(wx.stopPullDownRefresh);
        break;
      default:
        wx.stopPullDownRefresh();
    }
  },

  /**
   * 获取物资借用审批
   */
  fetchMatBorrowData() {
    return this.fetchData(app.globalData.dbMatBorrowCollection, "getMatBorrowList", 2);
  },

  /**
   * 获取物资新增审批
   */
  fetchMatAddItemData() {
    return this.fetchData(app.globalData.dbMatAddItemCollection, "getMatAddItemList", 3);
  },

  /**
   * 调用云函数获取审批
   * @param {String} collection 
   * @param {String} caller 
   * @param {Number} flagGet 1=>场地借用, 2=>物资借用, 3=>物资新增
   */
  async fetchData(collection, caller, flagGet) {
    try {
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: caller,
          collection: collection,
          filter: this.data.filter,
          operate: "read"
        }
      });
      console.log("[fetchNewMatData] res", res);
      if (res.result.err) {
        console.error(res.result.errMsg);
      } else {
        let data = res.result.data;
        this.setData({
          apprList: data,
          flagGet: data.length ? flagGet : 0
        });
      }
    } catch (err) {
      console.error("[fetchNewMatData] failed", err);
    }
  }
})