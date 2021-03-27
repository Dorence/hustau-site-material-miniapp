// pages/facilities/index.js
const app = getApp();
const db = wx.cloud.database();

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
    // ListTouch 扫码
    touch: {
      start: 0,
      direct: 0,
      class: ""
    }
  },

  /**
   * 监听页面加载
   */
  onLoad() {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: app.globalData.facIndexTitle
    });
    // 检查登录session
    this.checkLogin();
    // 获取用户信息
    this.getUserInfo();
  },

  /** 
   * 监听用户下拉刷新动作
   */
  onPullDownRefresh() {
    Promise.all([this.checkLogin(), this.getUserInfo()]).then(() => {
      wx.stopPullDownRefresh({
        complete() {
          console.log("[onPullDownRefresh] finish");
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
      path: app.globalData.facIndexPath
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
            success(res) {
              console.log("[getUserInfo] seccess", res);
              that.setData(res.userInfo);
            }
          });
        } else {
          console.log("No auth to 'scope.userInfo'.");
        }
      }
    });
  },

  /** 
   * 登录按钮回调
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
   * 链接至 listApproval
   * @param {Object} e event
   */
  navToApproval(e) {
    const dataset = e.currentTarget.dataset;
    if (this.data.exam[dataset.idx].num && dataset.urlget.length > 0) {
      wx.navigateTo({
        url: `approval/listApproval?${dataset.urlget}`
      });
    }
  },

  /** 
   * 获取各类审批的数量
   * @param {String} collection 待查询集合
   * @param {String} key Page.data 中字段
   * 
   * @note aggregate 聚合查询
   *   -> project 流水线输入映射为新字段（将 submitDate 转换为字符串）
   *   -> match 流水线筛选符合条件的输入，不能比较 Date 类型（筛选一年内的）
   *   -> sortByCount 流水线分类统计数量
   *   -> end 结束聚合查询
   */
  async updateNumber(collection, key) {
    const _ = db.command;
    let res = await db.collection(collection).aggregate()
      .project({
        exam: "$" + key,
        submitDate: _.aggregate.dateToString({
          date: "$submitDate",
          format: "%Y-%m-%d"
        })
      })
      .match({
        submitDate: _.gte(app._toDateStr(app._dayOffset(new Date(), -366), true))
      })
      .sortByCount("$" + key)
      .end();

    let table = this.data[key].slice();
    for (let i in table) table[i].num = 0;
    for (let it of res.list) table[it._id].num = it.count;
    
    console.log("[updateNumber]", res, table);
    this.setData({
      [key]: table
    });
    return this;
  },

  /** 
   * 检查用户登录状态
   */
  checkLogin() {
    const that = this;
    wx.checkSession({
      success(res) {
        // session_key 未过期，并且在本生命周期一直有效
        console.log("[checkSession] Has session.");
        if (++callLoginCnt >= 3) {
          console.warn("[checkLogin] times:", callLoginCnt);
          Promise.resolve().then(() => {
            setTimeout(() => {
              that.callCloudLogin(false);
            }, 50 * callLoginCnt * callLoginCnt);
          });
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
  async updateUserInfo(obj) {
    app.loginState = obj;
    this.setData(obj);
    return this;
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

  /**
   * 调用云函数登录, 并修改页面状态
   */
  async callCloudLogin(isShowToast = true) {
    const that = this;
    try {
      const res = await wx.cloud.callFunction({
        name: "login",
        data: {}
      });
      console.log("[login]", res.result);

      if (isShowToast)
        wx.showToast({
          title: "登录成功",
          icon: "success"
        });

      res.result.isLogin = true;
      await this.updateUserInfo(res.result);
      this.getUserInfo();
      // 如果是管理员, 获取各状态的数量
      if (this.isUserAdmin()) {
        this.updateNumber(app.globalData.dbFacFormCollection, "exam");
      }

    } catch (err) {
      console.error("[login]", err);
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
    }
  },

  // ListTouch触摸开始
  ListTouchStart(e) {
    this.setData({
      "touch.start": e.touches[0].pageX
    });
  },

  /**
   * ListTouch 计算方向, < 0: left, > 0 : right
   * @param {Object} e event
   */
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

  /**
   * ListTouch 按下扫码
   * @param {Object} e event 
   */
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
        console.log("[scanCode]", res);
        if (res.scanType === "QR_CODE" && res.result) {
          // scan success
          that.handleScanSuccess(res.result);
        } else {
          wx.showToast({
            title: "Unexpected",
            icon: "none",
            duration: 2000
          });
        }
      },
      fail() {
        wx.showToast({
          title: "Scan failed",
          icon: "none",
          duration: 2000
        });
      }
    });
  },

  /**
   * 扫码成功后跳转函数
   * @param {String} code 二维码译码结果
   */
  handleScanSuccess(code) {
    if (this.data.isLogin && /^[0-9a-z_-]{28},\d{6},\d+$/i.test(code)) {
      wx.navigateTo({
        url: "admin/userBind?&code=" + code
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