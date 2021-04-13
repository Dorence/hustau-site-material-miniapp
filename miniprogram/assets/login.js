(function () {
  "use strict";
  const Storage = require("./storage.js");
  let Login = {};

  Login.init = function (app, page) {
    this._app = app;
    this._page = page;
    this.callLoginCnt = 0;
    return this;
  }

  /** 
   * 更新全局变量 app.loginState
   */
  Login.updateUserInfo = async function (obj) {
    this._app.loginState = obj;
    this._page.setData(obj);
    return this;
  };

  /**
   * 调用云函数登录, 并修改页面状态
   */
  Login.cloudLogin = async function (isShowToast = true) {
    try {
      const res = await wx.cloud.callFunction({
        name: "login",
        data: {}
      });
      console.log("[cloudLogin]", res.result);

      if (isShowToast) wx.showToast({
        title: "登录成功",
        icon: "success"
      });

      res.result.isLogin = true;
      await this.updateUserInfo(res.result);
      this.userProfile();

      // 如果是管理员, 获取各状态的数量
      if (this.isUserAdmin())
        this._page.callUpdateNumber();

    } catch (err) {
      console.error("[login]", err);
      if (isShowToast) wx.showToast({
        title: "登录失败",
        icon: "none",
        duration: 2000
      });

      this.updateUserInfo({
        isLogin: false
      });
    }
  };

  /** 调用 wx.login */
  Login.localLogin = function () {
    const that = this;
    console.log("[localLogin]");
    if (!this._app.loginState || this._app.loginState.isLogin === false) {
      wx.login({
        success() {
          that.userProfile();
        }
      });
      this.cloudLogin(true);
    }
  };

  /**
   * 检查是否有授权并获取 userInfo 
   */
  Login.userProfile = function () {
    const that = this;
    switch (Storage.get("user_profile_state")) {
      case 1: // success
        this._page.setData(Storage.get("user_profile_data"));
        break;
      case 0: // failed
        wx.getUserInfo({
          success(res) {
            console.log("[getUserInfo]", res);
            that._page.setData(res.userInfo);
          }
        });
        break;
      default: // null or expired
        this.getUserProfile();
    }
  };

  Login.getUserProfile = function () {
    const that = this;
    wx.getUserProfile({
      desc: "用于完善用户资料",
      success(res) {
        console.log("[getUserProfile] seccess", res);
        Storage.set("user_profile_state", 1)
          .set("user_profile_data", res.userInfo);
        that._page.setData(res.userInfo);
      },
      fail() {
        console.log("[getUserProfile] fail");
        Storage.set("user_profile_state", 0)
          .remove("user_profile_data");
        if (!that._app.loginState)
          that.updateUserInfo({
            login: true
          });
      }
    });
  }

  /** 
   * 检查用户登录状态
   */
  Login.checkLogin = function () {
    const that = this;

    console.info("[checkLogin]");
    wx.checkSession({
      success() {
        // session_key 未过期，并且在本生命周期一直有效
        console.log("[checkSession] success");
        if (++that.callLoginCnt >= 3) {
          const delay = 50 * that.callLoginCnt * that.callLoginCnt;
          console.warn("[checkLogin] times", that.callLoginCnt, "delay", delay);
          setTimeout(() => {
            that.cloudLogin(false);
          }, delay);
        } else {
          that.cloudLogin(false);
        }
      },
      fail() {
        console.log("[checkSession] User not login.");
        that.updateUserInfo({
          isLogin: false
        });
      }
    });
  };

  /** 
   * 检查用户是否是管理员
   */
  Login.isUserAdmin = function () {
    if (this._app.loginState && typeof this._app.loginState === "object")
      return this._app.loginState.isLogin && this._app.loginState.isAdmin;
    else
      return false;
  }

  /** export */
  module.exports = Login;
})();