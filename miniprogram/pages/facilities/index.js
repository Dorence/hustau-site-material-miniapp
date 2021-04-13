// pages/facilities/index.js
const app = getApp();
const db = wx.cloud.database();
let Login = {};

Page({
  data: {
    avatarUrl: "../../assets/user-unlogin.png",
    exam: app.globalData.facExamStr.map(text => {
      return {
        num: null,
        text: text
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

    Login = require("../../assets/login.js").init(app, this);
    Login.checkLogin();
  },

  /** 
   * 监听用户下拉刷新动作
   */
  onPullDownRefresh() {
    Promise.all([Login.checkLogin()]).then(() => {
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
      path: app.globalData.facIndexPath
    }
  },

  /** 
   * 登录按钮回调
   */
  userProfile() {
    Login.localLogin();
  },

  /**
   * Login 模块调用 updateNumber
   */
  callUpdateNumber() {
    this.updateNumber(app.globalData.dbFacFormCollection, "exam");
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
        exam: "$exam",
        submitDate: _.aggregate.dateToString({
          date: "$submitDate",
          format: "%Y-%m-%d"
        })
      })
      .match({
        submitDate: _.gte(app._toDateStr(app._dayOffset(new Date(), -366), true))
      })
      .sortByCount("$exam")
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