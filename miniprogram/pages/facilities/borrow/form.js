// pages/facilities/borrow/form.js
const app = getApp();
const db = wx.cloud.database();

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
    facRoomList: ["加载中"],
    adminState: 0, // -1 => disabled, 0 => init, 1 => loaded
    adminRange: ["加载中"],
    adminIndex: 0,
    adminList: [],

    timeCheckMode: "none", // "none" | "warning" | "blocking"
    timeCheckWarnText: "申请时间与其他已通过申请冲突",

    // textarea length
    showContentMinLength: false,
    maxContentLength: 400,
    minContentLength: 0,
    contentLength: 0
  },

  /**
   * 页面加载时的事件
   */
  onLoad() {
    this.fetchFacData();
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
  async toFormObject(data) {
    const p = this.data;
    console.log("[toFormObject]", data, p);

    // return value
    let ret = {
      eventDate: data.eventDate,
      exam: 0,
      _openid: app.loginState.openid
    };

    // classroom
    if (!p.index) return {
      err: "请选择教室"
    };
    ret.classroomNumber = p.facRoomList[p.index];

    // trim and judge
    const trimArr = [
      ["associationName", "单位名称"],
      ["eventName", "活动名称"],
      ["responser", "活动负责人"],
      ["eventContent", "活动内容"]
    ];
    for (let item of trimArr) {
      data[item[0]] = data[item[0]].trim();
      if (!data[item[0]]) return {
        err: "请填写" + item[1]
      };
    }
    // end trim and judge

    // get event time
    ret.eventTime1 = p.timeArr[0][p.timeAIndex[0]] + ":" + p.timeArr[1][p.timeAIndex[1]];
    ret.eventTime2 = p.timeArr[0][p.timeBIndex[0]] + ":" + p.timeArr[1][p.timeBIndex[1]];

    const par = (_x) => {
      return [
        _x.eventTime1.length === 4 ? "0" + _x.eventTime1 : _x.eventTime1,
        _x.eventTime2.length === 4 ? "0" + _x.eventTime2 : _x.eventTime2
      ];
    };

    if (p.timeCheckMode !== "none") {
      const v = par(ret);
      // get borrowed list
      let res = await db.collection(app.globalData.dbFacFormCollection)
        .where({
          classroomNumber: ret.classroomNumber,
          eventDate: ret.eventDate,
          exam: 3
        }).field({
          eventTime1: true,
          eventTime2: true
        }).get();
      // console.log("[res]", res);

      for (let it of res.data) {
        let t = par(it);
        // console.log(t, v);
        if ((t[0] < v[0] && t[1] > v[0]) || (t[0] >= v[0] && t[0] < v[1])) {
          if (p.timeCheckMode === "blocking") {
            return {
              err: p.timeCheckWarnText
            };
          } else {
            ret.warn = p.timeCheckWarnText;
            break;
          }
        }
        // end for
      }
    }

    data.attendNumber = Number(data.attendNumber);
    if (!data.attendNumber || data.attendNumber < 0) return {
      err: "请正确填写活动人数"
    };

    if (!/^\d{11}$/.test(data.phone)) return {
      err: "请填写正确的手机号"
    };

    const ctxlen = data.eventContent.length;
    if (this.data.minContentLength > 0 && ctxlen < this.data.minContentLength) return {
      err: `活动内容不能少于${this.data.minContentLength}字`
    }

    if (this.data.maxContentLength > 0 && ctxlen > this.data.maxContentLength) return {
      err: `活动内容不能多于${this.data.maxContentLength}字`
    }

    ret.event = {
      association: data["associationName"],
      attendNumber: data.attendNumber,
      content: data.eventContent,
      name: data["eventName"],
      responser: data.responser,
      tel: data.phone
    };

    return ret;
  },

  /**
   * Submit the form, request for subscribing message
   * @param {object} e event
   */
  async submit(e) {
    const data = e.detail.value;
    const that = this;

    console.log("[submit]", data);

    let formObj = await this.toFormObject(data);

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

    const cb = () => {
      // subscribe, must be triggered by a tap
      wx.showModal({
        title: "温馨提示",
        content: "即将请求一次消息权限，用于通知您的审批结果",
        showCancel: false,
        complete() {
          that.subMsg(
            [app.globalData.submsgTmplId.apprResult],
            res => {
              formObj.isSubMsg = res === "accept";
              that.submitAppr(formObj);
            }
          );
        }
      });
    };

    if (formObj.hasOwnProperty("warn"))
      wx.showModal({
        title: "注意",
        content: formObj.warn,
        cancelText: "再去改改",
        confirmText: "仍要提交",
        success(res) {
          delete formObj.warn; // remove warning text
          if (res.confirm) cb();
        }
      });
    else
      cb();
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

  /**
   * 调用云函数提交
   * @param {Object}} formObj 待提交表单
   */
  async submitAppr(formObj) {
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

    try {
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: data
      });
      console.log("[submitAppr]", res);
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
    } catch (err) {
      console.error("[submitAppr]", err);
    }

    return this;
  },

  /**
   * 活动日期picker改变的函数
   * @param {Object} e event
   */
  bindDateChange(e) {
    console.log("[bindDateChange]", e.detail.value);
    this.setData({
      date: e.detail.value
    });
  },

  /**
   * 活动开始时间 picker 改变
   * @param {Object} e event
   */
  bindTimeAChange(e) {
    const A = e.detail.value,
      B = this.data.timeBIndex;
    console.log("[bindTimeAChange]", A);
    // 若 time2 < time1, 则 time2 = time1
    if (B[0] < A[0] || (B[0] === A[0] && B[1] < A[1])) {
      this.setData({
        timeAIndex: A,
        timeBIndex: A
      });
    } else {
      this.setData({
        timeAIndex: A
      });
    }
  },

  /**
   * 活动结束时间 picker 改变
   * @param {Object} e event
   */
  bindTimeBChange(e) {
    const B = e.detail.value,
      A = this.data.timeAIndex;
    console.log("[bindTimeBChange]", B);
    // 若 time2 < time1, 则 time2 = time1
    if (B[0] < A[0] || (B[0] === A[0] && B[1] < A[1])) {
      this.setData({
        timeBIndex: A
      });
    } else {
      this.setData({
        timeBIndex: B
      });
    }
  },

  /**
   * 多列 picker 的列响应, 无事件
   */
  bindTimeColChange() {},

  /**
   * 借用教室 picker 改变
   * @param {Object} e event
   */
  bindNumberChange(e) {
    console.log("[bindNumberChange]", e.detail.value)
    this.setData({
      index: e.detail.value
    });
  },

  /**
   * 审核人 picker 改变
   * @param {Object} e event
   */
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
    });
  },

  /**
   * 获取教室和管理员列表
   */
  async fetchFacData() {
    try {
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: "getFacData",
          operate: "read_2",
          extrainfo: {
            fetchAdmin: this.data.adminState >= 0
          }
        }
      });
      console.log("[fetchFacData]", res);
      if (res.result.err) {
        console.error(res.result.errMsg);
        return;
      }

      let admin = res.result.admin;
      admin.sort((_x, _y) => _x.name < _y.name ? -1 : 1);
      let room = res.result.facRoomList;
      room.unshift("请选择");

      this.setData({
        adminState: this.data.adminState >= 0 ? 1 : -1,
        adminList: admin,
        adminRange: admin.map(_x => _x.name),
        facRoomList: room
      });
    } catch (err) {
      console.error("[fetchFacData]", err);
    }
  }
});