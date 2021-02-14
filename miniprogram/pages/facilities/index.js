// pages/facilities/index.js
const app = getApp();
const db = wx.cloud.database();
const forms = db.collection(app.globalData.dbFacFormCollection);

let callLoginCnt = 0; // count times of calling Page.callCloudLogin

Page({
  data: {
    avatarUrl: "../../assets/user-unlogin.png",
    exam: app.globalData.facExamStr.map(text => {
      return {
        num: null,
        text
      }
    }),
    bigItems: [{
        name: "教室借用查询",
        url: "borrow/query",
        icon: "../../assets/availableClassroom.png"
      },
      {
        name: "教室借用",
        url: "borrow/form",
        icon: "../../assets/borrowClassroom.png"
      },
      {
        name: "进度查询",
        url: "../progressCheck/progressCheck?type=facilities",
        icon: "../../assets/progressCheck.png"
      }
    ],
    isLogin: false,
    touch: {
      start: 0,
      direct: 0,
      class: ""
    }
  },
  /**
   * 加载页面
   */
  onLoad() {
    this.checkLogin();
    // 获取用户信息
    this.getUserInfo();
    // 若为管理员, 获取各状态的数量
    if (this.isUserAdmin()) {
      this.updateNumber();
    }
  },

  /** 
   * 下拉刷新
   */
  onPullDownRefresh() {
    Promise.all([this.checkLogin(), this.getUserInfo()])
      .then(() => {
        wx.stopPullDownRefresh({
          complete() {
            console.log("[onPullDownRefresh] Finish.");
          }
        });
        return true;
      });
  },

  /**
   * share app
   * @param {Object} res 
   */
  onShareAppMessage(res) {
    return {
      title: app.globalData.appFullName,
      path: "/pages/facilities/index"
    }
  },

  /** 
   * 点击登录按钮
   */
  userLogin() {
    if (app.loginState.isLogin === false) {
      wx.login({
        success: this.getUserInfo
      });
      this.callCloudLogin(true);
    }
  },

  /** 
   * 检查是否有授权并获取 userInfo 
   */
  getUserInfo() {
    const that = this;
    wx.getSetting({
      success(res) {
        if (res.authSetting["scope.userInfo"]) {
          // 已授权,可以直接调用 getUserInfo
          wx.getUserInfo({
            success(r) {
              console.log("[getUserInfo] success.");
              that.setData(r.userInfo);
            }
          });
        } else {
          console.log("No auth to 'scope.userInfo'.");
        }
      }
    });
  },

  /** 链接至 listApproval */
  navToApproval(e) {
    const dataset = e.currentTarget.dataset;
    if (this.data.exam[dataset.idx].num && dataset.urlget.length > 0) {
      wx.navigateTo({
        url: `approval/listApproval?${dataset.urlget}`
      });
    }
  },

  /** 
   * 更新符合条件的审批的数量
   */
  updateNumber() {
    let expireDate = new Date();
    expireDate.setFullYear(expireDate.getFullYear() - 1);

    function updateSingle(flag, page) {
      return forms.where({
        exam: flag,
        submitDate: db.command.gte(expireDate)
      }).count().then(res => {
        page.setData({
          [`exam[${flag}].num`]: res.total
        });
      });
    }

    let arr = [];
    for (let i = 0; i < this.data.exam.length; i++)
      arr.push(updateSingle(i, this));
    return Promise.all(arr);
  },

  /** 检查用户登录状态 */
  checkLogin() {
    const that = this;
    wx.checkSession({
      success(res) {
        // session_key 未过期，并且在本生命周期一直有效
        console.log("[checkSession] Has session.");
        if (callLoginCnt++ >= 3) {
          console.warn("Call cloud function [login]:", callLoginCnt);
          let promise1 = new Promise(function (resolve, reject) {
            setTimeout(() => {
              that.callCloudLogin(false);
              resolve("Promise done " + callLoginCnt);
            }, 40 * callLoginCnt * callLoginCnt);
          });
          Promise.resolve().then(promise1).then(console.log)
        } else {
          that.callCloudLogin(false);
        }
      },
      fail() {
        console.log("[checkSession] User not log in.");
        that.updateUserInfo({
          isLogin: false
        });
      }
    });
  },

  /** 
   * 更新全局变量 app.loginState
   */
  updateUserInfo(obj) {
    const that = this;
    return Promise.resolve().then(() => {
      app.loginState = obj;
      that.setData(obj);
      return that;
    });
  },

  /** 
   * 检查用户是否是管理员
   */
  isUserAdmin() {
    if (app.loginState && typeof app.loginState === "object")
      return app.loginState.isLogin && app.loginState.isAdmin;
    else
      return false;
  },

  /** 调用云函数登录并修改页面状态 */
  callCloudLogin(isShowToast) {
    const that = this;
    wx.cloud.callFunction({
      name: "login",
      data: {}
    }).then((res) => {
      console.log("[login] call success", res.result);
      if (isShowToast)
        wx.showToast({
          title: "登录成功",
          icon: "success"
        });
      res.result.isLogin = true;
      that.updateUserInfo(res.result).then(() => {
        that.getUserInfo();
        // 如果是管理员,获取各状态的数量
        if (that.isUserAdmin()) {
          that.updateNumber();
        }
      });
    }).catch(err => {
      console.error("[login] call failed", err);
      if (isShowToast) {
        wx.showToast({
          title: "登录失败",
          icon: "none",
          duration: 2000
        });
      }
      that.updateUserInfo({
        isLogin: false
      });
    });
  },

  // ListTouch触摸开始
  ListTouchStart(e) {
    this.setData({
      "touch.start": e.touches[0].pageX
    });
  },

  // ListTouch计算方向. < 0: left, > 0 : right
  ListTouchMove(e) {
    this.setData({
      "touch.direction": e.touches[0].pageX - this.data.touch.start
    });
  },

  // ListTouch计算滚动
  ListTouchEnd(e) {
    this.setData({
      touch: {
        direction: 0,
        class: this.data.touch.direction < 0 ? e.currentTarget.dataset.target : ""
      }
    });
  },

  // ListTouch按下扫码
  ListTouchScan(e) {
    const that = this;
    if (!this.data.isLogin) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
        duration: 2000
      });
      return;
    }
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ["qrCode"],
      success(res) {
        console.log(res);
        if (res.scanType === "QR_CODE" && res.result) {
          // scan success
          that.handleScanSuccess(res.result);
        } else {
          wx.showToast({
            title: "Unexpected.",
            icon: "none",
            duration: 2000
          });
        }
      },
      fail() {
        wx.showToast({
          title: "Unexpected.",
          icon: "none",
          duration: 2000
        });
      }
    });
  },

  /**
   * 扫码成功后跳转函数
   */
  handleScanSuccess(code) {
    if (this.data.isLogin && /[0-9A-Za-z_-]{28},\d{6},\d+/.test(code)) {
      wx.navigateTo({
        url: 'superAdmin/userBind?&code=' + code
      });
    } else {
      wx.showToast({
        title: "未知操作",
        icon: "none",
        duration: 2000
      });
    }
  },

  /**
   * 管理员订阅被提及消息
   */
  subAdminMsg() {
    const that = this;
    const tmpl = app.globalData.submsgTmplId.facNewAppr;

    // get subscribe message permission
    wx.requestSubscribeMessage({
      tmplIds: [tmpl],
      success(res) {
        console.log("[wx.requestSubscribeMessage]", res)
        switch (res[tmpl]) {
          case "accept":
          case "reject":
            wx.showToast({
              title: res[tmpl],
              icon: "none",
              duration: 2000
            });
            break; // do nothing
          default:
            wx.showToast({
              title: "出现错误请重试",
              icon: 'error',
              duration: 1000
            });
        }
      },
      fail(res) {
        console.error("[wx.requestSubscribeMessage]", res);
        wx.showModal({
          title: "错误",
          content: "订阅消息时网络错误或权限被限制，是否重试？",
          cancelText: "跳过",
          confirmText: "重试",
          success(res) {
            if (res.confirm)
              that.subAdminMsg();
          }
        });
      }
    });
  }
});