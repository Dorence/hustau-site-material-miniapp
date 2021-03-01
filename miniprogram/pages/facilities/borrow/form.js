// pages/facilities/borrow/form.js
const app = getApp();
const db = wx.cloud.database();
const forms = db.collection(app.globalData.dbFacFormCollection);

Page({
  data: {
    date: app._toDateStr(new Date(), true),
    timeAIndex: [0, 0],
    timeBIndex: [0, 0],
    timeArr: (() => {
      let hr = [],
        mi = ["00", "05"];
      for (let i = 7; i <= 22; i++)
        hr.push(i);
      for (let i = 10; i <= 55; i += 5)
        mi.push(i);
      return [hr, mi];
    })(),
    canSubmit: false, // submit button
    index: 0,
    facRoomList: (() => {
      let arr = app.globalData.facRoomList.slice(); // copy
      arr.unshift("请选择");
      return arr;
    })(),
    adminState: 0, // -1 => disabled, 0 => init, 1 => loaded
    adminRange: ["加载中"],
    adminIndex: 0,
    adminList: [],
    maxContentLength: 300,
    contentLength: 0 // textarea
  },

  /**
   * 页面加载时的事件
   */
  onLoad() {
    if (this.data.adminState >= 0)
      this.fetchAdminList();

    wx.showModal({
      title: "注意事项",
      content: app.globalData.rule,
      showCancel: false,
      confirmText: "我已知晓",
      complete: () => {
        this.setData({
          canSubmit: true
        });
      }
    });
  },

  /**
   * 校验数据并生成对应的数据库对象
   * @param {object} data submit时表单的数据
   */
  toFormObject(data) {
    const p = this.data;
    if (!p.index) return {
      err: "请选择教室"
    };

    // trim and judge
    const trimArr = [
      ["associationName", "单位名称"],
      ["eventName", "活动名称"],
      ["eventResponser", "活动负责人"],
      ["eventContent", "活动内容"]
    ];
    for (let i = 0; i < trimArr.length; i++) {
      data[trimArr[i][0]] = data[trimArr[i][0]].trim();
      if (!data[trimArr[i][0]]) return {
        err: "请填写" + trimArr[i][1]
      };
    }
    // end trim and judge

    data.attendNumber = Number(data.attendNumber);
    if (!data.attendNumber || data.attendNumber < 0) return {
      err: "请正确填写活动人数"
    };

    if (!/^\d{11}$/.test(data.phone)) return {
      err: "请填写正确的手机号"
    };
    return {
      classroomNumber: p.facRoomList[p.index],
      eventDate: p.date,
      eventTime1: p.timeArr[0][p.timeAIndex[0]] + ":" + p.timeArr[1][p.timeAIndex[1]],
      eventTime2: p.timeArr[0][p.timeBIndex[0]] + ":" + p.timeArr[1][p.timeBIndex[1]],
      event: {
        association: data["associationName"],
        attendNumber: Number(data["attendNumber"]),
        content: data["eventContent"],
        name: data["eventName"],
        responser: data["eventResponser"],
        tel: data.phone
      },
      exam: 0,
      _openid: app.loginState.openid
    };
  },

  /**
   * Submit the form.
   * @param {object} e event
   */
  submit(e) {
    const data = e.detail.value;
    const that = this;

    console.log("[submit]", data);

    let formObj = this.toFormObject(data);

    // has error
    if (formObj.hasOwnProperty("err")) {
      wx.showModal({
        title: "提交失败",
        content: formObj.err,
        showCancel: false,
        confirmText: "再去改改"
      });
      return false;
    }

    // subscribe, must by a tap
    wx.showModal({
      title: "温馨提示",
      content: "即将请求一次消息权限，用于通知您的审批结果",
      showCancel: false,
      complete() {
        that.subMsg([app.globalData.submsgTmplId.apprResult], res => {
          formObj.isSubMsg = res === "accept";
          that.submitAppr(formObj);
        });
      }
    });
  },

  /**
   * get subscribe message permission
   * @param {String[]} tmplIds template id
   * @param {Function} complete only call the first subscribe 
   */
  subMsg(tmplIds, complete) {
    const that = this;
    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success(res) {
        console.log("[subMsg]", res);
        switch (res[tmplIds[0]]) {
          case "accept": // do nothing
            return complete("accept", res);
          case "reject": // do nothing
            return complete("reject", res);
          default:
            wx.showToast({
              title: "出现错误请重试",
              icon: "error",
              duration: 1000
            });
            return complete("error", res);
        }
      },
      fail(res) {
        console.error("[subMsg]", res);
        wx.showModal({
          title: "错误",
          content: "订阅消息时网络错误或权限被限制，是否重试？",
          cancelText: "跳过",
          confirmText: "重试",
          success(res) {
            if (res.confirm) {
              that.subMsg(tmplIds, complete);
              return; // no more callback
            } else return complete("reject");
          }
        });
      }
    });
  },

  submitAppr(formObj) {
    // add a mask to prevent multiple submissions
    wx.showLoading({
      mask: true,
      title: "提交中..."
    });
    this.setData({
      canSubmit: false
    });

    let data = {
      caller: "newBorrowFac",
      collection: app.globalData.dbFacFormCollection,
      add: formObj,
      operate: "add"
    };

    if (this.data.adminState > 0) {
      data.extrainfo = {
        adminOpenid: this.data.adminList[this.data.adminIndex].openid
      };
    }

    return wx.cloud.callFunction({
      name: "operateForms",
      data: data
    }).then(res => {
      console.log("[submitAppr]Success", res);
      wx.hideLoading();
      wx.showModal({
        title: "提交成功",
        content: `请确保策划案发送至${app.globalData.contactEmail}并耐心等待审核结果`,
        showCancel: false,
        complete() {
          wx.navigateBack({
            delta: 1
          });
        }
      });
    }).catch(err => {
      console.error("[submitAppr]failed", err);
    });
  },

  /**
   * 活动日期picker改变的函数
   */
  bindDateChange(e) {
    console.log("eventDate发送选择改变，携带值为", e.detail.value);
    this.setData({
      date: e.detail.value
    });
  },

  /**
   * 活动开始时间picker改变
   */
  bindTimeChange1(e) {
    const value = e.detail.value,
      B = this.data.timeBIndex;
    console.log("[bindTimeChange1]", value);
    // 检查time2是否大于time1, 若小于则令time2等于time1
    if (B[0] < value[0] || (B[0] == value[0] && B[1] == value[1])) {
      this.setData({
        timeAIndex: value,
        timeBIndex: value
      });
    } else {
      this.setData({
        timeAIndex: value
      });
    }
  },

  /**
   * 活动结束时间picker改变
   */
  bindTimeChange2(e) {
    const value = e.detail.value,
      A = this.data.timeAIndex;
    console.log("[bindTimeChange1]", value);
    // 检查time2是否大于time1, 若小于则令time2等于time1
    if (A[0] < value[0] || (A[0] == value[0] && A[1] < value[1])) {
      this.setData({
        timeBIndex: value
      });
    } else {
      this.setData({
        timeBIndex: A
      });
    }
  },

  /**
   * 多列picker的列响应, 无事件
   */
  bindTimeColChange() {},

  /**
   * 借用教室picker改变的函数
   */
  bindNumberChange: function (e) {
    console.log("[bindNumberChange]", e.detail.value)
    this.setData({
      index: e.detail.value
    });
  },

  bindAdminChange(e) {
    console.log("[bindAdminChange]", e.detail.value)
    this.setData({
      adminIndex: e.detail.value
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
  },

  async fetchAdminList() {
    try {
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: "getApprAdminList",
          collection: app.globalData.dbAdminCollection,
          field: {
            name: true,
            openid: true
          },
          filter: {
            isAdmin: true,
            showFacAppr: true
          },
          operate: "read"
        }
      });
      console.log("[fetchAdminList]res", res);
      if (res.result.err) {
        console.error(res.result.errMsg);
        return;
      }

      let data = res.result.data;
      data.sort((x, y) => x.name < y.name ? -1 : 1);
      this.setData({
        adminState: 1,
        adminList: data,
        adminRange: data.map(x_1 => x_1.name)
      });
    } catch (err) {
      console.error("[fetchAdminList]failed", err);
    }
  }
});