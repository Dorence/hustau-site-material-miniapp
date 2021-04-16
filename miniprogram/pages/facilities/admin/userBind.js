// pages/facilities/admin/userBind.js
const app = getApp();

Page({
  data: {
    scanKey: "",
    keys: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log("[options]", options);
    this.setData({
      scanKey: options.code,
      keys: options.code.split(",")
    });
    this.setData(app.loginState);
  },

  /**
   * Submit bind request
   * @param {Object} e event 
   */
  submit(e) {
    const form = e.detail.value;
    console.log("[form]", form);
    if (form.token !== this.data.keys[1]) {
      wx.showToast({
        title: "验证码错误",
        icon: "none",
        duration: 1500
      });
      return false;
    }
    form.name = form.name.trim();
    if (!form.name) {
      wx.showToast({
        title: "请填写姓名",
        icon: "none",
        duration: 2000
      });
      return false;
    }

    wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "bindUser",
        collection: app.globalData.dbAdminCollection,
        operate: "bindUser",
        update: {
          name: form.name,
          tel: form.tel
        },
        extrainfo: {
          superOpenid: this.data.keys[0],
          key: this.data.scanKey
        }
      }
    }).then(res => {
      console.log("[submit]", res);

      if (!res.result.err && res.result.updated === 1) {
        wx.showToast({
          title: "绑定成功",
          icon: "success",
          duration: 2500
        });
        setTimeout(() => {
          wx.navigateBack({
            delta: 1
          });
        }, 2600);
      } else {
        wx.showToast({
          title: "错误",
          icon: "none"
        });
      }
    }).catch(err => {
      console.error(err);
    });

    return true;
  },

  navBack() {
    wx.navigateBack({
      delta: 1
    });
  }
})