// pages/materials/borrow/index.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    availableItems: {},
    availableItemsGenres: [],
    toView: "Genre0",
    genreToChineseName: app.globalData.matCategory.map(v => v[0])
  },

  /**
   * 点击加号跳转至表单
   */
  onItemSelect(e) {
    let dataset = e.currentTarget.dataset;
    console.log("[onItemSelect]", dataset);

    let item = this.data.availableItems[dataset.genre][dataset.idx];
    let url = "";

    switch (this.data.type) {
      case "borrow": // 借用填表
        url += "./form";
        ["_id", "itemName", "itemId", "quantity"].forEach((v, i) => url += `${i?"&":"?"}${v}=${item[v]}`);
        console.log("[onItemSelect]url", url);
        wx.navigateTo({
          url: url
        });
        break;
      case "selOriginalMat": {
        const pages = getCurrentPages(); // get page stacks
        const prevPage = pages[pages.length - 2]; // previous page
        prevPage.setData(item);
        prevPage.setData({
          canSubmit: true
        });
        wx.navigateBack({
          delta: 1
        });
        break;
      }
      default:
        console.error("unknown type", this.data.type);
    }
    return;

  },

  onLoad(options) {
    this.setData(options);
    this.fetchItemsData();

    if (options.extra === "selectOriginalMaterial") {
      this.setData({
        navBackTo: options.navBack,
        selectOriginalMaterial: true
      });
      if (options.navBack == '../approval/viewApproval')
        this.setData({
          navBackExtraData: '&id=' + options.itemDocId + '&type=newMaterials' + '&isOriginalMaterials=true'
        });
    }
    console.log("[onLoad]", this.data)
  },

  //导航栏跳转
  selectMenu(e) {
    console.log("[selectMenu]", e);
    this.setData({
      toView: e.target.id
    })
  },

  /**
   * fetchItemsData()
   * 调用云函数获取可借用的物资信息
   */
  async fetchItemsData() {
    try {
      const res = await wx.cloud.callFunction({
        name: "operateForms",
        data: {
          caller: "fetchItemsData",
          collection: app.globalData.dbMatItemsCollection,
          filter: {
            quantityGreaterThan: 0
          },
          operate: "read"
        }
      });
      console.log("[fetchItemsData] res", res);
      if (res.result.err) {
        console.error("[fetchItemsData] error", res.result.err);
        return;
      }

      let x = res.result.data;
      let categorizedItems = [];
      if (x.length) {
        for (let i in x) {
          let genre = x[i].genre;
          if (!categorizedItems[genre]) categorizedItems[genre] = [];
          categorizedItems[genre].push(x[i]);
        }
        console.log("[items]", categorizedItems);
        this.setData({
          availableItems: categorizedItems,
          availableItemsGenres: Object.keys(categorizedItems)
        });
      }
    } catch (err) {
      console.error("[fetchItemsData]", err);
    }
  }
})