// pages/noticeBoard/index.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    date: app._toDateStr(new Date(), true),
    listData: [],
    showIndex: 0,
    text: app.globalData.rule,
    fourDate: [{"value":"7 days before", "day":-7}, {"value":"1 days before", "day":-1}, {"value":"1 days after", "day":1}, {"value":"7 days after", "day":1}]
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

  quickDateChange(e) {
    console.log(e.detail);
    for (let i = 0; i < 4; i++){
      if (e.detail.value == this.data.fourDate[i].value){
        this.setData({
          const j = this.data.fourDate[i].day,
          date: app._toDateStr(new Date(new Date().setDate(new Date().getDate() + j)), true),
          listData: []
        });
      }
    }
    this.updateTable();
  },

  quickDateChange1(e) {
    console.log(e.detail);
    this.setData({
      date: app._toDateStr(new Date(new Date().setDate(new Date().getDate() - 7)), true),
      listData: []
    });
    this.updateTable();
  },
  quickDateChange2(e) {
    console.log(e.detail);
    this.setData({
      date: app._toDateStr(new Date(new Date().setDate(new Date().getDate() - 1)), true),
      listData: []
    });
    this.updateTable();
  },
  quickDateChange3(e) {
    console.log(e.detail);
    this.setData({
      date: app._toDateStr(new Date(new Date().setDate(new Date().getDate() + 1)), true),
      listData: []
    });
    this.updateTable();
  },
  quickDateChange4(e) {
    console.log(e.detail);
    this.setData({
      date: app._toDateStr(new Date(new Date().setDate(new Date().getDate() + 7)), true),
      listData: []
    });
    this.updateTable();
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