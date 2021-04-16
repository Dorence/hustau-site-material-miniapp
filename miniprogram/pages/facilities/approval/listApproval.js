// pages/approval/listApproval.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    apprList: [],
    apprSort: 0,
    examState: app.globalData.facExamStr,
    advancedPanel: -1, // -1: disabled, 0: collapsed, 1: extended
    flagGet: -1,

    // advanced panel
    canSubmit: false,
    caret: "",
    eventDate1: "",
    eventDate2: "",
    exam: 0,
    examFilter: (x => (x.unshift("所有"), x))(app.globalData.facExamStr.slice())
  },

  /**
   * 监听页面加载
   * @param {Object} options 传入页面的参数 
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

    // advanced
    x = Number(options.advanced);
    if (!isNaN(x) && x >= 0) {
      this.setData({
        advancedPanel: x,
        canSubmit: true,
        caret: x > 0 ? "\u25BC" : "\u25BA"
      });
      // convert exSubmit to date
      if (filter.hasOwnProperty("exSubmit")) {
        filter.date = [
          app._toDateStr(app._dayOffset(new Date(), -filter.exSubmit), true),
          app._toDateStr(app._dayOffset(new Date(), 0), true)
        ];
        delete filter.exSubmit;
        this.setData({
          eventDate1: filter.date[0],
          eventDate2: filter.date[1]
        });
      }
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
  async fetchFacData() {
    const that = this;
    try {
      wx.showLoading({
        title: "加载中",
        mask: true
      });
      this.setData({
        canSubmit: false
      });

      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: "getApprList",
          collection: app.globalData.dbFacFormCollection,
          filter: this.data.filter,
          operate: "read"
        }
      });

      console.log("[fetchFacData]res", res);
      wx.hideLoading();
      this.setData({
        canSubmit: true
      });

      if (res.result.err) {
        console.error(res.result.errMsg);
        return;
      }

      let x = res.result.data;
      if (!Array.isArray(x)) x = [];

      for (let i in x)
        x[i].eventDate = app._toDateStr(new Date(x[i].eventDate));
      that.setData({
        apprList: x,
        flagGet: x.length ? 1 : 0
      });
    } catch (err) {
      console.error("[fetchFacData]", err);
      wx.hideLoading();
      this.setData({
        canSubmit: true
      });
    }
  },

  /**
   * 高级查询界面开关
   */
  toggleAdvancedPanel() {
    if (this.data.advancedPanel >= 0) {
      const flag = this.data.advancedPanel > 0 ? 0 : 1;
      this.setData({
        advancedPanel: flag,
        caret: flag ? "\u25BC" : "\u25BA"
      });
    }
  },

  /**
   * 日期 picker1 改变的函数
   * @param {Object} e event
   */
  bindDateChange1(e) {
    let A = e.detail.value;
    console.log("[bindDateChange1]", A);
    if (A > this.data.eventDate2) A = this.data.eventDate2;
    this.setData({
      eventDate1: A
    });
  },

  /**
   * 日期 picker2 改变的函数
   * @param {Object} e event
   */
  bindDateChange2(e) {
    let B = e.detail.value;
    console.log("[bindDateChange2]", B);
    if (B < this.data.eventDate1) B = this.data.eventDate1;
    this.setData({
      eventDate2: B
    });
  },

  /**
   * 状态 picker 改变的函数
   * @param {Object} e event
   */
  bindExamChange(e) {
    console.log("[bindExamChange]", e.detail.value);
    this.setData({
      exam: Number(e.detail.value)
    });
  },

  /**
   * Submit the query
   * @param {object} e event
   */
  async submit(e) {
    const value = e.detail.value;
    console.log("[submit]", value);

    let filter = {
      date: [this.data.eventDate1, this.data.eventDate2]
    };

    if (this.data.exam > 0)
      filter.exam = this.data.exam - 1;

    if (value.associationIncl)
      filter.associationIncl = value.associationIncl;

    this.setData({
      filter: filter
    });

    console.log("[filter]", filter);
    await this.fetchFacData();
  }
})