// pages/approval/listApproval.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    apprList: [],
    examState: [],
    newMaterialsExamState: ["未审批", "已审批"],
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

    this.setData({
      type: options.type
    });

    if (options.type === "borrow") {
      this.setData({
        examState: app.globalData.matExamStr
      });
      this.fetchMatData();
    } else if (options.type === 'newMaterials') {
      this.fetchNewMatData();
    } else {
      console.error("[onLoad] error type");
    }

  },
  /**
   * parse url options
   * @param {Object} options 传入的get对象(options)
   */
  getUrl: function (options) {
    const last = (day) => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    };
    let obj = {};
    let x = Number(options.flag);
    if (!isNaN(x) && x >= 0) obj.exam = x;

    x = Number(options.expireSubmit);
    if (!isNaN(x)) {
      obj.exSubmit = x;
      this.setData({
        expire: x + "天"
        // expire: "所有时间"
      });
    } else {
      this.setData({
        expire: "所有时间"
      });
    }
    console.log("[getUrl]", obj);
    this.setData({
      filter: obj
    });
    return (Object.keys(obj).length > 0) ? obj : false;
  },

  /**
   * 用户下拉动作刷新
   */
  onPullDownRefresh() {
    switch (this.data.type) {
      case "borrow":
        this.fetchMatData().then(wx.stopPullDownRefresh);
        break;
      default:
        wx.stopPullDownRefresh();
    }
  },

  // /*NOTE:尚未写成云函数!!! */
  // fetchFormsForMaterials: function() {
  //   const that = this;
  //   // console.log('filter=',that.data.filter);
  //   db.collection('formsForMaterials').where({
  //       exam: that.data.filter.exam
  //     })
  //     .get({
  //       success(res) {
  //         // res.data 是包含以上定义的两条记录的数组
  //         console.log(res.data);
  //         that.setData({
  //           apprList: res.data,
  //           flagGet: res.data.length ? 2 : 0 /*2 denotes materials*/
  //         })
  //         // console.log('flag=',that.data.flagGet)
  //       }
  //     })
  // },

  /**
   * fetchMatData()
   * 调用云函数获取物资借用审批
   */
  fetchMatData() {
    const that = this;
    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "getMatBorrowList",
        collection: app.globalData.dbMatBorrowCollection,
        filter: this.data.filter,
        operate: "read"
      }
    }).then(res => {
      console.log("[fetchMatData]res", res);
      if (res.result.err) {
        console.error(res.result.errMsg);
        return;
      }

      let x = res.result.data;
      that.setData({
        apprList: x,
        flagGet: x.length ? 2 : 0
      });
    }).catch(err => {
      console.error("[fetchMatData]failed", err);
    });
  },

  /**
   * fetchNewMatData()
   * 调用云函数获取物资借用审批
   */
  fetchNewMatData: function () {
    const that = this;
    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "getApprovalList",
        collection: "addNewMaterials",
        filter: that.data.filter,
        operate: "read"
      }
    }).then(res => {
      console.log("[fetchNewMatData]res", res);
      if (res.result.err) {
        console.warn("ERROR");
        return;
      }

      let x = res.result.data;
      if (x.length) {
        that.setData({
          apprList: x,
          flagGet: x.length ? 3 : 0
        });
      } else {
        that.setData({
          apprList: [],
          flagGet: 0
        });
      }
      console.log(that.data.apprList);
    }).catch(err => {
      console.error("[newFetchData]failed", err);
    });
  }


})