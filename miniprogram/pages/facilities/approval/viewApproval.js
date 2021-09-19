// pages/facilities/approval/viewApproval.js
const app = getApp();
const db = wx.cloud.database();

function fetchDB(PAGE) {
  // 场地借用, 修改为云函数
  return wx.cloud.callFunction({
    name: "operateForms",
    data: {
      caller: "getAppr",
      collection: app.globalData.dbFacFormCollection,
      docID: PAGE.data.id,
      isDoc: true,
      operate: "read"
    }
  }).then(res => {
    console.log("[fetchDB]res", res);
    if (res.result.err) {
      console.error("[ERROR]", res.result.errMsg);
      return;
    }

    let x = res.result.data;
    x.submitDate = app._toMinuteStr(new Date(x.submitDate));
    PAGE.setData({
      appr: x || {}
    });

    if (x.exam <= 1) {
      PAGE.setData({
        "appr.check.approver": app.loginState.name
      });
    }

    if (x.check && x.check.comment) {
      PAGE.setData({
        commentLength: x.check.comment.length
      });
    }
  }).catch(err => {
    console.error("[fetchDB]", err);
  });
}

const cmp = (_x, _y) => {
  return _x.eventTime1 == _x.eventTime1 ? _x.eventTime2 < _y.eventTime2 : _x.eventTime1 < _y.eventTime1
};

function getInter(a) {
  const inside = (v, arr) => {
    for (let i = 0; i < arr.length; i++)
      if (v >= arr.eventTime1 && v <= arr.eventTime2) return i;
    return -1;
  };
  let n, x = [];
  for (let i = 0; i < a.length; a++) {
    n = inside(a[i].eventTime1, x);
    if (n < 0) x.push(a[i]);
    else if (x[n].eventTime2 < a[i].eventTime2) x[n].eventTime2 = a[i].eventTime2;
  }
  x.sort(cmp);
  return x;
};

Page({
  data: {
    imgBaseDir: "../../../assets/",
    examState: app.globalData.facExamStr,
    commentLength: 0,
    maxCommentLength: 140,
    canSubmit: true,
    eventInfo: [{
      badge: "group.png",
      name: "申请单位",
      value: "association"
    }, {
      badge: "user.png",
      name: "申请人",
      value: "responser"
    }, {
      badge: "phone.png",
      name: "联系方式",
      value: "tel"
    }, {
      badge: "bookmark.png",
      name: "活动名称",
      value: "name"
    }, {
      badge: "flag.png",
      name: "活动内容",
      value: "content"
    }]
  },
  onLoad(options) {
    // test options
    console.log("[onLoad]options", options);
    if (!app._isIDString(options.id, [16, 32, 36])) {
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
          }, 2000);
        }
      });
      return;
    }
    this.setData(options);

    // get database
    fetchDB(this);
  },

  /* 用户下拉动作刷新 */
  onPullDownRefresh() {
    fetchDB(this).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  submit(e) {
    var flag = Number(e.detail.target.dataset.flag);
    const value = e.detail.value;
    const PAGE = this;

    value.comment = value.comment ? value.comment.trim() : "";

    console.log("[update]", this.data.id, " [flag]", flag, " [value]", value);

    this.setData({
      canSubmit: false
    });
    wx.showLoading({
      title: "提交中",
      mask: true
    });

    // call cloud function
    wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "updateFacAppr",
        collection: app.globalData.dbFacFormCollection,
        docID: this.data.id,
        isDoc: true,
        operate: "update",
        update: {
          check: value,
          exam: flag
        },
        extrainfo: {
          thing5: "场地借用", // 申请类型 {{thing5.DATA}}
          thing6: `${this.data.appr.eventDate} ${this.data.appr.classroomNumber}`, // 申请内容 {{thing6.DATA}}
          phrase1: this.data.examState[flag], // 审批结果 {{phrase1.DATA}}
          thing11: value.comment, // 审批说明 {{thing11.DATA}}
          character_string12: this.data.appr.formid // 申请单号 {{character_string12.DATA}}
        }
      }
    }).then(res => {
      console.log("[updateApproval]", res);
      wx.hideLoading();
      if (res.err || res.updated < 1)
        wx.showToast({
          title: "出错了, 请稍后重试",
          icon: "none",
          duration: 2000,
          mask: true
        });
      else
        wx.showToast({
          title: "更新成功",
          icon: "success",
          duration: 2000,
          mask: true
        });
      fetchDB(PAGE).then(() => {
        PAGE.setData({
          canSubmit: true
        });
      });
    }).catch(err => {
      console.error("[updateApproval]", err);
      wx.showToast({
        title: "出错了, 请稍后重试",
        icon: "none",
        duration: 2000,
        mask: true
      });
      PAGE.setData({
        canSubmit: true
      });
    });
  },

  /**
   * 输入活动内容时更新字数
   * @param {Object} e 传入的事件, e.detail.value为文本表单的内容
   */
  userInput(e) {
    this.setData({
      commentLength: e.detail.value.length
    });
  },

  /**
   * checkAvailTime()
   * 检查该审批的借用时间内该教室是否空闲
   */
  checkAvailTime() {
    const a = this.data.appr;
    if (!a || Object.keys(a).length === 0) return false;
    const filter = {
      exam: 3,
      classroomNumber: a.classroomNumber,
      eventDate: app._toDateStr(new Date(a.eventDate), true)
    };
    console.log("[filter]", filter);
    db.collection(app.globalData.dbFacFormCollection).where(filter).field({
        eventTime1: true,
        eventTime2: true,
        formid: true
      }).get()
      .then(res => {
        console.log("[checkAvailTime]res", res);
        res.data.sort(cmp);
        let arr = getInter(res.data);
        console.log("[intervals]", arr);
        if (arr.length) {
          // 当天有借用
          const str = arr.reduce((s, cur) => {
            return s + "\n" + cur.eventTime1 + "-" + cur.eventTime2;
          }, ""); // reduce 转为字符串
          console.log("[str]", str);
          wx.showModal({
            title: "查询结果",
            content: "当天占用时间: \n" + str,
            showCancel: false,
            confirmText: "好的"
          });
        } else {
          // 当天全天无借用
          wx.showModal({
            title: "查询结果",
            content: "全天空闲",
            showCancel: false,
            confirmText: "知道了"
          });
        }
        return;
      });
  },

  /**
   * 长按复制
   */
  longPressCopy: function (e) {
    const v = e.currentTarget.dataset.copy;
    console.log("[longPressCopy]", v);
    wx.setClipboardData({
      data: v,
      success(res) {
        wx.showToast({
          title: "复制成功"
        });
      }
    });
  }
})