// pages/noticeBoard/index.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    date: app._toDateStr(new Date(), true),
    listData: [],
    showIndex: 0,
    text: app.globalData.rule
  },
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

  /** 
   * get database 
   */
  updateTable() {
    const that = this;
    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "listBorrow",
        collection: "forms",
        filter: {
          exam: 3,
          date: this.data.date
        },
        operate: "read"
      }
    }).then(res => {
      console.log("[updateTable]res", res);
      let x = res.result.data;
      if (x.length) {
        let arr = [];
        for (let i = 0; i < x.length; ++i)
          arr.push({
            association: x[i].event.association,
            room: x[i].classroomNumber,
            time: x[i].eventTime1 + "\t~ " + x[i].eventTime2,
            responser: x[i].event.responser,
            tel: x[i].event.tel
          });
        arr.sort((_x, _y) => {
          return (_x.room === _y.room) ? (_x.time > _y.time) : (_x.room > _y.room);
        });
        that.setData({
          listData: arr,
        });
        wx.showToast({
          title: "刷新成功",
          icon: "success",
          mask: true,
          duration: 600
        });
      } else {
        wx.showToast({
          title: "当日无借用",
          icon: "success",
          mask: true,
          duration: 1000
        });
      }
    }).catch(console.error);
  }

})