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

  quickDateChange(e) {
    const dataset = e.currentTarget.dataset || {}; // get data-*
    console.log("[quickDateChange]", dataset);

    if (dataset.offset) {
      let d = new Date(this.data.date);
      d.setDate(d.getDate() + dataset.offset);
      // console.log("date", this.data.date, "next", d);
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
   * get database 
   */
  updateTable() {
    const that = this;
    wx.showLoading({
      mask: true,
      title: "Loading"
    });

    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "listBorrow",
        collection: app.globalData.dbFacFormCollection,
        filter: {
          exam: 3,
          date: this.data.date
        },
        operate: "read"
      }
    }).then(res => {
      console.log("[updateTable]", res);
      wx.hideLoading();

      let x = res.result.data;
      if (x && x.length) {
        let arr = [];
        for (let i in x) {
          arr.push({
            association: x[i].event.association,
            room: x[i].classroomNumber,
            time: x[i].eventTime1 + "\t~ " + x[i].eventTime2,
            responser: x[i].event.responser,
            tel: x[i].event.tel
          });
        }
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
          icon: "success",
          mask: false,
          duration: 800
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
    }).catch(console.error);
  }

})