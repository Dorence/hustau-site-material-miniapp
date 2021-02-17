// pages/approval/viewApproval.js
const app = getApp();
const db = wx.cloud.database();

function fetchDB(PAGE) {
  console.log("[fetchDB]", PAGE.data.type);
  if (PAGE.data.type === "borrow") {
    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "getMatBorrowAppr",
        collection: app.globalData.dbMatBorrowCollection,
        docID: PAGE.data.id,
        isDoc: true,
        operate: "read"
      }
    }).then(res => {
      console.log("[fetchDB]res", res);
      if (res.result.err) {
        console.error("[error]", res.result.errMsg);
        return;
      }
      let x = res.result.data;
      x.submitDate = app._toMinuteStr(new Date(x.submitDate));

      if (!x.check)
        x.check = {};
      if (x.exam === 0)
        x.check.borrowApprover = app.loginState.name;
      if (x.exam === 5 && !x.check.returnApprover)
        x.check.returnApprover = app.loginState.name;
      PAGE.setData({
        appr: x,
        canSubmit: true
      });

      if (x.check.hasOwnProperty("comment")) {
        PAGE.setData({
          borrowCommentLength: x.check.comment.length
        });
      }
      if (x.hasOwnProperty("returnQuantity")) {
        PAGE.setData({
          checkReturnQuantity: x.returnQuantity
        });
      }
      return PAGE.fetchItem(x.itemDoc);
    }).catch(err => {
      console.error("[fetchDB]failed", err);
    });
  } else if (PAGE.data.type === "additem") {
    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "getMatAddItemAppr",
        collection: app.globalData.dbMatAddItemCollection,
        docID: PAGE.data.id,
        isDoc: true,
        operate: "read"
      }
    }).then(res => {
      console.log("[fetchDB]res ", res);
      if (res.result.err) {
        console.error("[error]", res.result.errMsg);
        return;
      }
      let x = res.result.data;
      x.submitDate = app._toMinuteStr(new Date(x.submitDate));

      if (!x.check)
        x.check = {};
      if (x.exam === 0)
        x.check.approver = app.loginState.name;

      PAGE.setData({
        appr: x,
        canSubmit: true
      });

      if (x.isOriginalMat) {
        PAGE.fetchItem(x.itemDoc).then(() => {
          PAGE.setData({
            "appr.genre": PAGE.data.itemInfo.genre,
            "appr.location": PAGE.data.itemInfo.location,
            "appr.itemName": PAGE.data.itemInfo.itemName,
            "appr.check.comment": PAGE.data.itemInfo.description,
            additemCommentLength: PAGE.data.itemInfo.description.length
          });
        });
      }

      return PAGE;
    }).catch(err => {
      console.error("[fetchDB] failed", err);
    });
  }
}

Page({
  data: {
    // common
    imgBaseDir: "../../../assets/",
    canSubmit: false,

    //  borrow
    examState: app.globalData.matExamStr,
    checkReturnQuantity: null,

    borrowCommentLength: 0,
    maxBorrowCommentLength: 140,
    returnCommentLength: 0,
    maxReturnCommentLength: 140,

    borrowMatInfo: [{
      badge: "group.png",
      name: "申请单位",
      value: "association"
    }, {
      badge: "user.png",
      name: "申请人",
      value: "name"
    }, {
      badge: "phone.png",
      name: "联系方式",
      value: "phone"
    }, {
      badge: "user.png",
      name: "院系班级",
      value: "class"
    }, {
      badge: "user.png",
      name: "学号",
      value: "studentId"
    }, {
      badge: "flag.png",
      name: "借用用途",
      value: "description"
    }],
    returnMatInfo: [{
      badge: "flag.png",
      name: "归还数量",
      value: "returnQuantity"
    }, {
      badge: "time.png",
      name: "归还时间",
      value: "returnDate"
    }, {
      badge: "flag.png",
      name: "物资状态",
      value: "returnStatus"
    }],

    // additem info
    category: app.globalData.matCategory.map(x => x.join("，")),
    locArr: app.globalData.matLocation,
    examStateAdd: app.globalData.matExamAddStr,

    additemCommentLength: 0,
    maxAdditemCommentLength: 140
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

  /**
   * 用户下拉动作刷新 
   */
  onPullDownRefresh() {
    fetchDB(this).then(wx.stopPullDownRefresh);
  },

  /**
   * submit borrow approval
   * @param {Object} e 
   */
  submitBorrow(e) {
    const flag = Number(e.detail.target.dataset.flag);
    const value = e.detail.value;

    if (value.borrowComment)
      value.borrowComment = value.borrowComment.trim();

    console.log("[submitBorrow]", this.data.id, " [flag]", flag, " [value]", value);
    this.submitBorrowAppr(this.data.id, {
      check: value,
      exam: flag
    });
  },

  /**
   * submit return approval
   * @param {Object} e 
   */
  submitReturn(e) {
    const flag = Number(e.detail.target.dataset.flag);
    const value = e.detail.value;

    let quantity = Number(value.checkReturnQuantity);
    if (isNaN(quantity) || quantity < 0) {
      wx.showModal({
        title: "错误",
        content: "请核对归还数量",
        showCancel: false,
        confirmText: "再去改改"
      });
    } else if (quantity > this.data.appr.quantity) {
      wx.showModal({
        title: "注意",
        content: "归还数量大于借出数量",
        success(res) {
          if (res.confirm) this.submitReturnCb(flag, value, quantity);
        }
      });
    } else {
      this.submitReturnCb(flag, value, quantity);
    }
  },

  submitReturnCb(flag, value, quantity) {
    const check = {
      returnApprover: value.returnApprover,
      returnComment: value.returnComment ? value.returnComment.trim() : ""
    };
    ["borrowApprover", "borrowComment"].forEach(x => check[x] = this.data.appr.check[x]);

    console.log("[submitReturnCb]", this.data.id, " [flag]", flag, " [check]", check);
    this.submitBorrowAppr(this.data.id, {
      check: check,
      exam: flag,
      returnQuantity: quantity
    });
  },

  submitBorrowAppr(docId, updateData) {
    const that = this;
    // prevent multiple submissions
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
        caller: "updateMatBorrowAppr",
        collection: app.globalData.dbMatBorrowCollection,
        docID: docId,
        isDoc: true,
        operate: "update",
        update: updateData,
        extrainfo: {
          itemDoc: this.data.appr.itemDoc
        }
      }
    }).then(res => {
      console.log("[submitBorrowAppr]", res);
      wx.hideLoading();

      if (res.result.err || res.result.updated < 1)
        wx.showToast({
          title: "出错了, 请稍后重试",
          icon: "none",
          duration: 3000,
          mask: true
        });
      else
        wx.showToast({
          title: "更新成功",
          icon: "success",
          duration: 2000,
          mask: true
        });
      fetchDB(that).then(() => {
        that.setData({
          canSubmit: true
        });
      });
    }).catch(err => {
      console.error("[submitBorrowAppr]", err);
      wx.hideLoading();
      wx.showToast({
        title: "出错了, 请稍后重试",
        icon: "none",
        duration: 2000,
        mask: true
      });
      that.setData({
        canSubmit: true
      });
    });
  },

  /**
   * submit add item approval
   * @param {Object} e 
   */
  submitAdditem(e) {
    const value = e.detail.value;

    value.quantity = Number(value.quantity);
    if (isNaN(value.quantity) || value.quantity <= 0) {
      wx.showModal({
        title: "提交失败",
        content: "请核对新增物资数量",
        showCancel: false,
        confirmText: "再去改改"
      });
      return false;
    }

    value.itemName = value.itemName.trim();
    if (!value.itemName) {
      wx.showModal({
        title: "提交失败",
        content: "请输入物资名称",
        showCancel: false,
        confirmText: "再去改改"
      });
      return;
    }

    value.itemId = value.itemId.trim();
    if (!value.itemId) {
      wx.showModal({
        title: "提交失败",
        content: "请输入物资编号",
        showCancel: false,
        confirmText: "再去改改"
      });
      return;
    }

    if (!value.location[0]) {
      wx.showModal({
        title: "提交失败",
        content: "请选择物资位置",
        showCancel: false,
        confirmText: "再去改改"
      });
      return;
    }

    if (value.description)
      value.description = value.description.trim();

    console.log("[submitAdditem]", value);

    let item = {
      description: value.description,
      location: value.location,
      quantity: value.quantity // @note 补充物资时需转化为 db.command.inc
    };
    let update = {
      check: {
        approver: this.data.appr.check.approver,
        openid: app.loginState.openid,
        comment: value.description
      },
      exam: 1
    }
    if (this.data.appr.isOriginalMat) {
      // 补充物资
      update.check.quantity = value.quantity;
    } else {
      // 新增物资
      item.genre = Number(value.genre);
      item.itemId = value.itemId;
      item.itemName = value.itemName;

      update.itemId = value.itemId;
      update.itemName = value.itemName;
    }

    let extrainfo = {
      item: item
    };
    if (this.data.appr.isOriginalMat) {
      extrainfo.itemDoc = this.data.itemInfo._id;
    }

    console.log("[update]", update, "[extrainfo]", extrainfo);
    return this.submitAdditemAppr(update, extrainfo);
  },

  async submitAdditemAppr(update, extrainfo) {
    // prevent multiple submissions
    this.setData({
      canSubmit: false
    });
    wx.showLoading({
      title: "提交中",
      mask: true
    });

    try {
      // 补充物资
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: this.data.appr.isOriginalMat ? "addItemExisted" : "addItemNew",
          collection: app.globalData.dbMatAddItemCollection,
          docID: this.data.appr._id,
          isDoc: true,
          operate: "update",
          update: update,
          extrainfo: extrainfo
        }
      });

      if (res.result.err || res.result.updated < 1) {
        console.error("[submitAdditemAppr]", res.result);
        wx.hideLoading();
        wx.showToast({
          title: "出错了, 请稍后重试",
          icon: "none",
          duration: 3000,
          mask: true
        });
        this.setData({
          canSubmit: true
        });
        return false;
      }

      wx.showToast({
        title: "提交成功",
        icon: "success",
        duration: 2000,
        mask: true
      });

      fetchDB(this); // 会更新 canSubmit
    } catch (error) {
      console.error("[submitAdditemAppr]", err);
      wx.hideLoading();
      wx.showToast({
        title: "出错了, 请稍后重试",
        icon: "none",
        duration: 2000,
        mask: true
      });
      this.setData({
        canSubmit: true
      });
    }
    return true;
  },

  /**
   * 根据 itemDoc 获取物资信息
   * @param {String} itemDoc 
   */
  async fetchItem(itemDoc) {
    try {
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: "getItemInfo",
          collection: app.globalData.dbMatItemsCollection,
          docID: itemDoc,
          // field: {
          //   quantity: true
          // },
          isDoc: true,
          operate: "read"
        }
      });
      console.log("[fetchItem]res", res);
      if (res.result.err) {
        console.error("[error]", res.result.errMsg);
        return res.result;
      }
      let x = res.result.data;
      this.setData({
        itemInfo: x
      });
      return x;
    } catch (err) {
      console.error("[fetchItem]failed", err);
      return false;
    }
  },

  /**
   * 借用审批意见输入时更新字数
   * @param {Object} e 传入的事件, e.detail.value为文本表单的内容
   */
  borrowCommentInput(e) {
    this.setData({
      borrowCommentLength: e.detail.value.length
    });
  },

  /**
   * 归还审批意见输入时更新字数
   * @param {Object} e 传入的事件, e.detail.value为文本表单的内容
   */
  returnCommentInput(e) {
    this.setData({
      returnCommentLength: e.detail.value.length
    });
  },

  /**
   * 物资备注输入时更新字数
   * @param {Object} e 传入的事件, e.detail.value为文本表单的内容
   */
  additemCommentInput(e) {
    this.setData({
      additemCommentLength: e.detail.value.length
    });
  },

  bindCategoryChange(e) {
    console.log("[bindCategoryChange]", e.detail.value)
    this.setData({
      "appr.genre": e.detail.value
    });
  },

  bindLocationChange(e) {
    console.log("[bindLocationChange]", e.detail.value)
    this.setData({
      "appr.location": e.detail.value
    })
  },

  /** 长按复制 */
  longPressCopy: app._longPressCopy
})