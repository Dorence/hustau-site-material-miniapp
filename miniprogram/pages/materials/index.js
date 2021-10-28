// pages/materials/index.js
const app = getApp();
const db = wx.cloud.database();
const LOGIN = require("../../assets/login.js");
let Login = {};

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
      },
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

    Login = new LOGIN(app, this);
    Login.checkLogin();
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
      path: app.globalData.matIndexPath
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
    this.updateNumber(app.globalData.dbMatBorrowCollection, "examBorrow");
    this.updateNumber(app.globalData.dbMatAddItemCollection, "examAdd");
  },

  /**
   * 链接至 listApproval
   * @param {Object} e event
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
  }
});