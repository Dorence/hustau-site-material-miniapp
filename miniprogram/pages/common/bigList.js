// pages/common/bigList.js
Component({
  /**
   * @param col{{Number}} 分栏数 1-4, 默认为2
   */
  properties: {
    col: {
      type: Number,
      value: 2
    },
    nodes: Array,
    enable: {
      type: Boolean,
      value: true
    },
    strError: {
      type: String,
      value: "请先登录"
    }
  },

  methods: {
    tap(e) {
      // console.log(e);
      const dataset = e.currentTarget.dataset;
      if (this.data.enable) {
        console.log("navigateTo", dataset.url);
        wx.navigateTo(dataset);
      } else {
        wx.showToast({
          title: this.data.strError,
          icon: "none",
          duration: 2000
        });
      }
    }
  }
});