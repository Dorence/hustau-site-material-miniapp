// pages/facilities/borrow/query.js
const app = getApp();

Page({
  data: {
    date: app._toDateStr(new Date(), true),
    listData: [],
    showIndex: 0,
    text: app.globalData.rule,
    quickDate: [{
      text: "<上周",
      offset: -7
    }, {
      text: "前一天",
      offset: -1
    }, {
      text: "后一天",
      offset: 1
    }, {
      text: "下周>",
      offset: 7
    }]
  },

  /**
   * 加载页面
   */
  onLoad() {
    this.updateTable();
  },

  /**
   * 日期选择器回调
   * @param {Object} e event
   */
  bindDateChange(e) {
    console.log("[bindDateChange]", e.detail);
    if (e.detail.value !== this.data.date) {
      this.setData({
        date: e.detail.value,
        listData: []
      });
      this.updateTable();
    }
  },

  /**
   * quickDate 按钮组回调
   * @param {Object} e event
   */
  quickDateChange(e) {
    const dataset = e.currentTarget.dataset || {}; // get data-*
    console.log("[quickDateChange]", dataset);

    if (dataset.offset) {
      let d = app._dayOffset(this.data.date, dataset.offset);
      this.setData({
        date: app._toDateStr(d, true),
        listData: []
      });
      this.updateTable();
    } else {
      wx.showToast({
        title: "错误",
        icon: "error",
        mask: true,
        duration: 1000
      });
    }
  },

  /** 
   * Get borrowed classroom list on this.data.date
   */
  async updateTable() {
    const that = this;
    wx.showLoading({
      mask: true,
      title: "Loading"
    });

    try {
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: "facQuery",
          collection: app.globalData.dbFacFormCollection,
          field: {
            facQueryBasic: true
          },
          filter: {
            exam: 3,
            date: this.data.date
          },
          operate: "read"
        }
      });

      console.log("[updateTable]", res);
      wx.hideLoading();

      let x = res.result.data;
      if (x && x.length) {
        let arr = x.map(it => {
          return {
            association: it.event.association,
            room: it.classroomNumber,
            time: it.eventTime1 + " ~ " + it.eventTime2,
            responser: it.event.responser,
            tel: it.event.tel
          };
        });
        arr.sort((_x, _y) => {
          return (
            (_x.room === _y.room) ? (_x.time < _y.time) : (_x.room < _y.room)
          ) ? -1 : 1;
        });
        that.setData({
          listData: arr
        });
      } else {
        wx.showToast({
          title: "当日无借用",
          duration: 500
        });
        that.setData({
          listData: [{
            association: "",
            room: "空闲",
            time: "",
            responser: "",
            tel: ""
          }]
        });
      }
    } catch (err) {
      console.error("[updateTable]", err);
    }
    return this;
  }
})