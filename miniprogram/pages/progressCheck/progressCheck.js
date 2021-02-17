// pages/progressCheck/progressCheck.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    locArr: app.globalData.matLocation
  },
  /**
   * 加载页面
   * @param {Object} options
   * @param {String} options.type facilities|materials
   */
  onLoad(options) {
    console.log("[options]", options);
    this.setData(options);

    // 使得回调函数可以访问this.setData
    const that = this;

    // check openid
    const openid = app.loginState.openid;
    console.log(openid);
    if (!(/[0-9A-Za-z_-]{28}/.test(openid))) {
      // invalid openid
      this.invalidToast();
      return;
    }

    // use blocks to isolate variables
    switch (options.type) {
      case "facilities": {
        // fetch data
        db.collection(app.globalData.dbFacFormCollection).where({
          _openid: openid
        }).get({
          success(e) {
            // console.log(e);
            let arr = e.data || [];
            // sort by submit time
            arr.sort((_x, _y) => _x.submitDate > _y.submitDate ? -1 : 1);
            that.setData({
              examState: app.globalData.facExamStr,
              progressList: arr
            });
            console.log("[data]", that.data);
          },
          fail: console.error
        });

        // end of facilities
        break;
      }
      case "materials": {
        db.collection(app.globalData.dbMatBorrowCollection).where({
          _openid: openid
        }).get().then(res => {
          let arr = res.data || [];
          // sort by submit time
          arr.sort((_x, _y) => _x.submitDate > _y.submitDate ? -1 : 1);
          for (let i in arr)
            if (arr[i].confirmBorrowTime)
              arr[i].confirmBorrowTime = app._toMinuteStr(new Date(arr[i].confirmBorrowTime));
          that.setData({
            examState: app.globalData.matExamStr,
            progressList: arr
          });
        }).then(() => {
          let list = that.data.progressList;
          for (let i in list)
            if (list[i].exam >= 3) {
              db.collection(app.globalData.dbMatItemsCollection).doc(list[i].itemDoc).field({
                location: true
              }).get().then(res => {
                console.log("[res.data]", res.data, i);
                that.setData({
                  [`progressList[${i}].location`]: res.data.location
                });
              }).catch(err => {
                console.error(err);
              });
            }
          // end for
          console.log("[data]", that.data);
        }).catch(err => {
          console.error("[progressCheck]failed", err);
        })

        // end of materials
        break;
      }
      default:
        this.invalidToast();
    }
    return; // end of onLoad
  },

  /**
   * 确认借出
   */
  confirmBorrow(e) {
    const that = this;
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.progressList[index];

    wx.showModal({
      title: "确认借出",
      content: `请确保于${item.eventDate2}前归还并填写归还表单`,
      success(res) {
        if (!res.confirm)
          return;

        // call cloud function
        wx.cloud.callFunction({
          name: "operateForms",
          data: {
            caller: "userConfirmBorrow",
            collection: app.globalData.dbMatBorrowCollection,
            docID: item._id,
            isDoc: true,
            operate: "confirmBorrow",
            update: {
              exam: 4,
              itemDoc: item.itemDoc,
              quantity: item.quantity
            }
          }
        }).then(res => {
          console.log("[confirmBorrow]", res);
          if (res.result.err || res.result.updated < 1)
            wx.showToast({
              title: "出错了, 请稍后重试",
              icon: "none",
              duration: 3000,
              mask: true
            });
          else {
            wx.showToast({
              title: "更新成功",
              icon: "success",
              duration: 2000,
              mask: true
            });
            that.setData({
              [`progressList[${index}].exam`]: 4,
              [`progressList[${index}].confirmBorrowTime`]: app._toDateStr(new Date())
            });
          }
        }).catch(err => {
          console.error("[confirmBorrow]", err);
          wx.showToast({
            title: "出错了, 请稍后重试",
            icon: "none",
            duration: 2000,
            mask: true
          });
        });
        // end wx.cloud.callFunction
      }
    });
  },

  /**
   * 无效访问框
   */
  invalidToast() {
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
  },

  /** 长按复制 */
  longPressCopy: app._longPressCopy
})