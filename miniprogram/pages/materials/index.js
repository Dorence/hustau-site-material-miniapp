// pages/materials/index.js
const app = getApp();
const db = wx.cloud.database();

let callLoginCnt = 0; // count times of calling Page.callCloudLogin

Page({
  data: {
    avatarUrl: "../../assets/user-unlogin.png",
    examBorrow: app.globalData.matExamStr.map(text => {
      return {
        num: null,
        text: text
      }
    }),
    examAdd: app.globalData.matExamAddStr.map(text => {
      return {
        num: null,
        text: text
      }
    }),
    bigItems: [{
        name: "物资查询及借用",
        url: "borrow/index?type=borrow",
        icon: "../../assets/borrowClassroom.png"
      },
      {
        name: "进度查询",
        url: "../progressCheck/progressCheck?type=materials",
        icon: "../../assets/progressCheck.png"
      },
      {
        name: "新增仓库物资",
        url: "additem/form",
        icon: "../../assets/plus.png"
      }
    ]
  },


  /**
   * 监听页面加载
   */
  onLoad() {
    // 禁用物资板块
    if (app.globalData.matDisabled)
      return;
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: app.globalData.matIndexTitle
    });
    // 检查登录session
    this.checkLogin();
    // 获取用户信息
    this.getUserInfo();
  },

  onShow() {
    // 禁用物资板块
    if (app.globalData.matDisabled)
      wx.showModal({
        title: "敬请期待",
        content: "",
        showCancel: false,
        complete() {
          wx.switchTab({
            url: `/${app.globalData.facIndexPath}`
          });
        }
      });
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
   * 用户点击右上角分享
   * @param {Object} res 
   */
  onShareAppMessage(res) {
    return {
      title: app.globalData.appFullName,
      path: app.globalData.matIndexPath
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
   */
  navToApproval(e) {
    const dataset = e.currentTarget.dataset;
    if (this.data[dataset.arr][dataset.flag].num && dataset.urlget.length > 0) {
      wx.navigateTo({
        url: `approval/listApproval?flag=${dataset.flag}&${dataset.urlget}`
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
   *   -> match 流水线筛选符合条件的输入，不能比较 Date 类型
   *   -> sortByCount 流水线分类统计数量
   *   -> end 结束聚合查询
   */
  async updateNumber(collection, key) {
    const _ = db.command;
    let res = await db.collection(collection).aggregate()
      .project({
        exam: "$exam",
        submitDate: _.aggregate.dateToString({
          date: "$submitDate",
          format: "%Y-%m-%d"
        })
      })
      .match({
        submitDate: _.gte(app._toDateStr(app._dayOffset(new Date(), -365), true))
      })
      .sortByCount("$exam")
      .end();

    let table = this.data[key].slice();
    for (let i in table) table[i].num = 0;
    for (let it of res.list) table[it._id].num = it.count;
    // console.log("[res]", res, "[table]", table);
    this.setData({
      [key]: table
    })
    return table;
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

  /** 调用云函数登录并修改页面状态 */
  callCloudLogin(isShowToast = true) {
    const that = this;
    wx.cloud.callFunction({
      name: "login",
      data: {}
    }).then(res => {
      console.log("[login]", res.result);
      if (isShowToast)
        wx.showToast({
          title: "登录成功",
          icon: "success"
        });
      res.result.isLogin = true;
      that.updateUserInfo(res.result).then(() => {
        that.getUserInfo();
        // 如果是管理员, 获取各状态的数量
        if (that.isUserAdmin()) {
          that.updateNumber(app.globalData.dbMatBorrowCollection, "examBorrow");
          that.updateNumber(app.globalData.dbMatAddItemCollection, "examAdd");
        }
        that.showRedDot();
      });
    }).catch(err => {
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
    });
  },

  /**
   *红点渲染函数，用于提醒归还物资 
   */
  showRedDot: function () {
    db.collection(app.globalData.dbMatBorrowCollection).where({
      _openid: app.loginState.openid,
      exam: db.command.in([3, 4])
    }).count().then(res => {
      console.log("[showRedDot] total", res.total);
      if (res.total > 0) {
        wx.showTabBarRedDot({
          index: 1,
          success() {
            console.log("[showRedDot] show red dot")
          }
        });
      } else {
        console.log("[showRedDot] hide red dot")
        wx.hideTabBarRedDot({
          index: 1
        });
      }
    });
  },

})