// pages/facilities/borrowClassroom.js
const app = getApp();
const db = wx.cloud.database();
const forms = db.collection("forms");

Page({
  data: {
    date: app._toDateStr(new Date(), true),
    timeAIndex: [0, 0],
    timeBIndex: [0, 0],
    timeArr: (() => {
      let hr = [],
        mi = ["00", "05"];
      for (let i = 7; i <= 22; i++)
        hr.push(i);
      for (let i = 10; i <= 55; i += 5)
        mi.push(i);
      return [hr, mi];
    })(),
    index: 0,
    array: (() => {
      let arr = Object.assign([], app.globalData.classroomList);
      arr.unshift("请选择");
      return arr;
    })(),
    maxContentLength: 300,
    contentLength: 0 /* textarea */
  },
  /**
   * 页面加载时的事件
   */
  onLoad: function () {
    wx.showModal({
      title: "注意事项",
      content: app.globalData.rule,
      showCancel: false,
      confirmText: "好"
    });
  },
  /**
   * toFormObject()
   * @param {object} data submit时表单的数据
   * 校验数据并生成对应的数据库对象
   */
  toFormObject: function (data) {
    const p = this.data;
    if (!p.index) return {
      err: "请选择教室"
    };

    // trim and judge
    const trimArr = [
      ["associationName", "单位名称"],
      ["eventName", "活动名称"],
      ["eventResponser", "活动负责人"],
      ["eventContent", "活动内容"]
    ];
    for (let i = 0; i < trimArr.length; i++) {
      data[trimArr[i][0]] = data[trimArr[i][0]].trim();
      if (!data[trimArr[i][0]]) return {
        err: "请填写" + trimArr[i][1]
      };
    }
    // end trim and judge

    data.attendNumber = Number(data.attendNumber);
    if (!data.attendNumber || data.attendNumber < 0) return {
      err: "请正确填写活动人数"
    };

    if (!(/\d{11}/.test(data.phone))) return {
      err: "请填写正确的手机号"
    };
    return {
      classroomNumber: p.array[p.index],
      eventDate: p.date,
      eventTime1: p.timeArr[0][p.timeAIndex[0]] + ":" + p.timeArr[1][p.timeAIndex[1]],
      eventTime2: p.timeArr[0][p.timeBIndex[0]] + ":" + p.timeArr[1][p.timeBIndex[1]],
      event: {
        association: data["associationName"],
        attendNumber: Number(data["attendNumber"]),
        content: data["eventContent"],
        name: data["eventName"],
        responser: data["eventResponser"],
        tel: data.phone
      },
      submitDate: new Date(),
      exam: 0
    }
  },
  /**
   * 在线填表页面点击报名的函数
   */
  submit: function (e) {
    const PAGE = this;
    const formsData = e.detail.value;
    // console.log("[formsData]",formsData);
    let formObj = this.toFormObject(formsData);
    // has error
    if (formObj.hasOwnProperty("err")) {
      wx.showModal({
        title: "提交失败",
        content: formObj.err,
        showCancel: false,
        confirmText: "再去改改"
      });
      return;
    }

    forms.orderBy("formid", "desc").limit(2).field({
        formid: true,
        exam: true,
        submitDate: true
      }).get()
      .then(res => {

        let genIDNew = (formid) => {
          formid = formid.toString();
          console.log("previous formid", formid);

          let tm = new Date();
          let season = !(tm.getMonth() >= 1 && tm.getMonth() < 7);
          // @note - getMonth() => 0:Jan, 1:Feb, ... , 11:Dec
          let prefix = tm.getFullYear().toString() + (season ? "Fall" : "Spri");

          let newFormNumber = 1;
          if (formid.substring(0, 8) === prefix)
            newFormNumber = Number(formid.substring(8)) + 1;
          console.log("[newFormNumber]", newFormNumber);

          let newID = "";
          for (let i = 0; i < 5; i++) {
            let m = newFormNumber % 10;
            // JS calculate '%' and '/' as float
            newID = m + newID;
            newFormNumber = (newFormNumber - m) / 10;
          }
          newID = prefix + newID;
          console.log("[newID]", newID);
          return newID;
        };

        // let genIDOld = (formid) => {
        //   console.log("previous formid", formid);
        //   let date = new Date();
        //   let yr = date.getFullYear();
        //   let newFormNumber = "00001";
        //   if (formid && Number(formid.substr(0, 4)) === yr) {
        //     return (Number(formid) + 1).toString();
        //   } else {
        //     return yr + "00001";
        //   }
        // };

        formObj.formid = genIDNew(res.data[0] ? res.data[0].formid : "");
        console.log("[formObj]", formObj);
        // begin forms.add()
        forms.add({
          data: formObj,
          success(res) {
            console.log("Successfully add to db!");
            wx.showModal({
              title: "提交成功",
              content: `请确保策划案发送至公邮${app.globalData.contactEmail}并耐心等待审核结果`,
              success: res => {
                if (res.confirm)
                  wx.navigateBack({
                    delta: 1
                  });
              }
            });
            // end showModal
          }
        });
        // end forms.add()
      });
  },
  /**
   * 活动日期picker改变的函数
   */
  bindDateChange: function (e) {
    console.log("eventDate发送选择改变，携带值为", e.detail.value);
    this.setData({
      date: e.detail.value
    });
  },
  /**
   * 活动开始时间picker改变
   */
  bindTimeChange1: function (e) {
    const value = e.detail.value,
      B = this.data.timeBIndex;
    console.log("[bindTimeChange1]", value);
    // 检查time2是否大于time1, 若小于则令time2等于time1
    if (B[0] < value[0] || (B[0] == value[0] && B[1] == value[1])) {
      this.setData({
        timeAIndex: value,
        timeBIndex: value
      });
    } else {
      this.setData({
        timeAIndex: value
      });
    }
  },
  /**
   * 活动结束时间picker改变
   */
  bindTimeChange2: function (e) {
    const value = e.detail.value,
      A = this.data.timeAIndex;
    console.log("[bindTimeChange1]", value);
    // 检查time2是否大于time1, 若小于则令time2等于time1
    if (A[0] < value[0] || (A[0] == value[0] && A[1] < value[1])) {
      this.setData({
        timeBIndex: value
      });
    } else {
      this.setData({
        timeBIndex: A
      });
    }
  },
  /**
   * 时间的多列picker的列响应时间, 无事件
   */
  bindTimeColChange1: () => {},
  /**
   * 借用教室picker改变的函数
   */
  bindNumberChange: function (e) {
    console.log("[bindNumberChange]", e.detail.value)
    this.setData({
      index: e.detail.value
    })
  },
  /**
   * contentInput()
   * 输入活动内容时的响应, 显示字数
   * @param {Object} e 传入的事件, e.detail.value为文本表单的内容
   */
  contentInput: function (e) {
    this.setData({
      contentLength: e.detail.value.length
    })
  }
});