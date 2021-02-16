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

      x.submitDate = app._toDateStr(new Date(x.submitDate));

      if (!x.check)
        x.check = {};
      if (x.exam === 0)
        x.check.approver = app.loginState.name;

      PAGE.setData({
        appr: x,
        canSubmit: true
      });

      if (x.check.hasOwnProperty("comment")) {
        PAGE.setData({
          borrowCommentLength: x.check.comment.length
        });
      }

      return PAGE.fetchItem(x.itemDoc);
    }).catch(err => {
      console.error("[fetchDB]failed", err);
    });
  }
}

Page({
  data: {
    imgBaseDir: "../../../assets/",
    examState: app.globalData.matExamStr,
    newMaterialsExamState: ["未审批", "已审批"],
    commentLength: 0,
    maxCommentLength: 140,
    category: ['服饰类', '宣传类', '奖品类', '工具类', '装饰类', '文本类', '其他'],
    genreLetters: ["A", "B", "C", "D", "E", "F", "G"],
    locationArray: [
      ['一号仓库', '二号仓库', "三号仓库", '四号仓库'],
      ['无货架号', '货架号1', '货架号2', '货架号3', '货架号4', '货架号5', '货架号6'],
      ['无分区号', '分区A', '分区B', '分区C', '分区D', '分区E']
    ],
    checkReturnQuantity: null,

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

    canSubmit: false,
    borrowCommentLength: 0,
    maxBorrowCommentLength: 140,
    returnCommentLength: 0,
    maxReturnCommentLength: 140
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
    // fetchDB(this).then(() => {
    //   console.log('fetch DB back!PAGE.data is', PAGE.data)
    //   // HACK: 如果页面是从borrowThings导航而来，则表明该物品被管理员认为是原有物资 
    //   // 于是覆盖掉表单上关于物品是否为原有物资的信息
    //   if (PAGE.data.isOriginalMaterials)
    //     PAGE.setData({
    //       "appr.isOriginalMaterials": true,
    //       "appr.itemDocId": PAGE.data.itemDocId
    //     })
    // });
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

  submitNewMaterials: function (e) {
    // Note: formsData中itemName和itemId直接可用 
    // 其余数据来自PAGE.data.appr (aka. apprData)
    const formsData = e.detail.value;
    const PAGE = this;
    const apprData = PAGE.data.appr;

    if (formsData.description) formsData.description = formsData.description.trim();

    //若为原有物资
    if (apprData.isOriginalMaterials) {
      console.log("[update]", apprData.itemDocId, "in  collection `item`, add quantity = ", apprData.addNumber);
      wx.showLoading({
        title: "提交中",
        mask: true
      });
      // call cloud function
      wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: "addMaterials",
          collection: "items",
          docID: apprData.itemDocId,
          isDoc: true,
          operate: "update",
          update: {
            addQuantity: apprData.addNumber
          }
        }
      }).then(res => {
        console.log("[addMaterials] callFunction", res);
        // [Boolean]res.error indicates if calling has error
        if (res.result.err || res.result.stats.updated < 1) {
          wx.showToast({
            title: "出错了, 请稍后重试",
            icon: "none",
            duration: 3000,
            mask: true
          });
          return;
        }

        // call cloud function
        wx.cloud.callFunction({
          name: "operateForms",
          data: {
            caller: "updateNewMatAppr",
            collection: "addNewMaterials",
            docID: this.data.id,
            isDoc: true,
            operate: "update",
            update: {
              check: apprData.check,
              exam: 1
            }
          }
        }).then(res => {
          console.log("[updateApproval]", res);
          wx.hideLoading();
          // [Boolean]res.error indicates if calling has error
          if (res.result.err || res.updated < 1) wx.showToast({
            title: "出错了, 请稍后重试",
            icon: "none",
            duration: 3000,
            mask: true
          });
          else wx.showToast({
            title: "数据库已更新",
            icon: "success",
            duration: 2000,
            mask: true
          });
          fetchDB(PAGE);
        }).catch(console.error);

      }).catch(err => {
        console.error(err);
        return;
      });

    } else {
      console.log("[add] new item in collection `item`, [formsData]", formsData)
      console.log("apprData", apprData)
      if (!formsData.itemId || !formsData.itemName) {
        wx.showModal({
          title: "提交失败",
          content: "信息不完整",
          showCancel: false,
          confirmText: "再去改改"
        });
        return;
      }

      db.collection("items").where({
        "itemId": formsData.itemId
      }).count().then(res => {
        if (!res.total) {
          let formObj = {
            itemName: formsData.itemName,
            itemId: formsData.itemId,
            description: formsData.description,
            genre: apprData.genre,
            location: apprData.location,
            quantity: apprData.addNumber

          }
          console.log("formObj", formObj, res.total)
          wx.showLoading({
            title: "提交中",
            mask: true
          });
          db.collection("items").add({
            data: formObj,
            success(res) {
              console.log("Successfully add to db!");
              console.log("res:", res)
            },
            fail(res) {
              console.error;
              return
            }
          });

          // call cloud function
          wx.cloud.callFunction({
            name: "operateForms",
            data: {
              caller: "updateNewMatAppr",
              collection: "addNewMaterials",
              docID: this.data.id,
              isDoc: true,
              operate: "update",
              update: {
                check: apprData.check,
                exam: 1
              }
            }
          }).then(res => {
            console.log("[updateApproval]", res);
            wx.hideLoading();
            // [Boolean]res.error indicates if calling has error
            if (res.result.err || res.updated < 1) wx.showToast({
              title: "出错了, 请稍后重试",
              icon: "none",
              duration: 3000,
              mask: true
            });
            else wx.showToast({
              title: "数据库已更新",
              icon: "success",
              duration: 2000,
              mask: true
            });
            fetchDB(PAGE);
          }).catch(console.error);
        } // end of if(!res.total) 
        else {
          wx.showModal({
            title: "提交失败",
            content: "物资id已存在",
            showCancel: false,
            confirmText: "再去改改"
          });
          return;
        }
      })

    } // end of else

  },

  /**
   * 根据 itemDoc 获取物资信息
   * @param {String} itemDoc 
   */
  fetchItem(itemDoc) {
    const that = this;
    wx.cloud.callFunction({
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
    }).then(res => {
      console.log("[fetchItem]res", res);
      if (res.result.err) {
        console.error("[error]", res.result.errMsg);
        return;
      }
      let x = res.result.data;
      that.setData({
        itemInfo: x
      });
      return;
    }).catch(err => {
      console.error("[fetchItem]failed", err);
    });
    return true;
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
  returnCommentInput: function (e) {
    this.setData({
      returnCommentLength: e.detail.value.length
    });
  },

  switchChange: function (e) {
    const PAGE = this
    console.log('switch发送选择改变，携带值为', e.detail.value)
    PAGE.setData({
      'appr.isOriginalMaterials': e.detail.value
    })
  },

  bindCategoryChange: function (e) {
    console.log('genre picker发送选择改变，携带值为', e.detail.value)
    const PAGE = this
    const genreLetters = PAGE.data.genreLetters
    let value = e.detail.value

    this.setData({
      "appr.genre": genreLetters[value],
      "appr.genreIndex": value
    })
    console.log(PAGE.data.genre)
  }, //新增物资类别

  /**
   * 将picker传入的数组 e.g.[0,2,1] 转换为数据库中的location数组
   * 其中location格式为 [1, 2, 'A'] 
   * *note*:若后两位为0则删去， 若中间为0，第三位不为零，则中间设置为null
   */
  bindLocationPickerChange: function (e) {
    console.log('picker发送选择改变，携带值为', e.detail.value)
    const PAGE = this;
    let value = e.detail.value;

    function locationIndexToLocation(idx) {
      var value1 = idx.slice();

      value1[0] = value1[0] + 1;
      if (value1[2] == 0) {
        value1.pop();
        if (value1[1] == 0) value1.pop();
      } else {
        value1[2] = PAGE.data.genreLetters[value1[2] - 1]
        // convert index to genre letters
        if (value1[1] == 0) value1[1] = null;
      }

      return value1
    }
    let loc = locationIndexToLocation(value);
    console.log("location", loc)
    console.log("locationIndex", value)
    PAGE.setData({
      "appr.location": loc,
      "appr.locationIndex": value
    })

    console.log(PAGE.data)
  },

  /** 长按复制 */
  longPressCopy: app._longPressCopy
})