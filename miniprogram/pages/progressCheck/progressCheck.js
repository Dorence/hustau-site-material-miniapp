// pages/progressCheck/progressCheck.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    examState: [],
    progressList: [],
    type: ""
  },
  /**
   * 加载页面
   * @param {Object} options
   * @param {String} options.type "facilities" | "materials"
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
        db.collection("formsForMaterials").where({
          _openid: openid
        }).get().then(res => {
          let arr = res.data || [];
          // sort by submit time
          arr.sort((_x, _y) => _x.submitDate > _y.submitDate ? -1 : 1);
          that.setData({
            examState: app.globalData.matExamStr,
            progressList: arr
          });
        }).then(() => {
          var progressList = that.data.progressList;
          for (let i in progressList)
            if (progressList[i].exam > 2) {
              let itemId = progressList[i].itemId;
              // console.log('itemId:',itemId)
              db.collection("items").where({
                itemId: itemId
              }).get({
                success(e) {
                  if (e.data.length == 1) {
                    location = e.data[0].location;
                    console.log("[location]", location);
                  } else {
                    location = e.data[0] ? e.data[0].location : [];
                    console.warn("itemId is not unique", location);
                  }

                  that.setData({
                    [`progressList[${i}].location`]: location
                  });
                },
                fail: console.error
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
  }
})