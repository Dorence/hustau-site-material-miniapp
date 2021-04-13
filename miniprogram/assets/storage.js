(function () {
    "use strict";
    const DefaultExpire = 365 * 24 * 60 * 60;
    let Str = {};

    /** 判断字符串是否为空 */
    function isNull(str) {
        if (str === undefined || str === "undefined") return true;
        else if (str === null) return true;
        else if (typeof str == "string") return "" === str.replace(/^\s*|\s*$/g, "");
        return false;
    };

    /*
     * 判断字符串是否为非空
     */
    function isNotNull(str) {
        return !isNull(str);
    };

    /** offset: seconds */
    function getTime(offset = 0) {
        return new Date().getTime() + 1000 * offset;
    }

    /**
     * localStorage 操作
     */
    if (wx.setStorageSync != undefined) Str._f_set = wx.setStorageSync;
    else if (localStorage != undefined) Str._f_set = localStorage.setItem;
    else if (uni.setStorageSync != undefined) Str._f_set = uni.setStorageSync;
    else console.error("No localStorage set");

    if (wx.getStorageSync != undefined) Str._f_get = wx.getStorageSync;
    else if (uni.getStorageSync != undefined) Str._f_get = uni.getStorageSync;
    else if (localStorage != undefined) Str._f_get = localStorage.getItem;
    else console.error("No localStorage get");

    if (wx.removeStorageSync != undefined) Str._f_rm = wx.removeStorageSync;
    else if (uni.removeStorageSync != undefined) Str._f_rm = uni.removeStorageSync;
    else if (localStorage != undefined) Str._f_rm = localStorage.removeItem;
    else console.error("No localStorage remove");

    /**
     * @function Str.clear
     * 清空
     */
    if (wx.clearStorageSync != undefined) Str.clear = wx.clearStorageSync;
    else if (uni.clearStorageSync != undefined) Str.clear = uni.clearStorageSync;
    else if (localStorage != undefined) Str.clear = localStorage.clear;
    else console.error("No localStorage clear");

    /**
     * 保存
     * @param {Object} key 键名
     * @param {Object} value 键值
     * @param {Number} second 缓存时间, seconds
     * @param {String} ctag 组名
     */
    Str.set = function (key, value, second = DefaultExpire, ctag = null) {
        second = Number(second);
        if (isNaN(second) || second <= 0)
            second = DefaultExpire;

        let data = {
            value: value,
            expire: getTime(second)
        };
        if (isNotNull(ctag)) {
            // 如果存在组主键名，则保存在组主键下
            let base = this.get(ctag) || {};
            base[key] = data;
            data = {
                value: base,
                expire: getTime(DefaultExpire)
            };
            key = ctag;
        }
        this._f_set(key, JSON.stringify(data));
        return this;
    };

    /**
     * 读取
     * @param {Object} key 键名
     * @param {String} ctag 组主键名
     */
    Str.get = function (key, ctag) {
        let _key = key;
        if (isNotNull(ctag))
            key = ctag; // 如果存在组主键名，则读取组主键内容

        let data = this._f_get(key);
        if (isNotNull(data)) {
            if (typeof data == 'string')
                data = JSON.parse(data);
            if (isNotNull(ctag)) {
                if (data.expire != null && data.expire < getTime(0)) {
                    this.remove(ctag);
                    return null;
                }
                data = data.value[_key]; // 重新赋值
                if (isNull(data)) return null;
            }
            if (data.expire != null && data.expire < getTime(0)) {
                this.remove(_key, ctag);
                return null;
            }
            return data.value;
        }
        return null;
    };

    /**
     * 删除指定键
     * @param {Object} key 键名
     * @param {String} ctag 组主键名
     */
    Str.remove = function (key, ctag) {
        if (isNotNull(ctag)) {
            if (isNull(key)) {
                key = ctag;
            } else {
                let baseVal = this.get(ctag) || {};
                delete baseVal[key];
                if (JSON.stringify(baseVal) == '{}') key = ctag;
                else this.set(ctag, baseVal, null);
            }
        }
        this._f_rm(key);
        return this;
    };

    /** export */
    if (typeof module != 'undefined')
        module.exports = Str;
    else
        window.storage = Str;
})();