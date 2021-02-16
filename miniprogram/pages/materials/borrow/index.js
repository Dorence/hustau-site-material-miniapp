// pages/materials/borrow/index.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    availableItems: {},
    availableItemsGenres: [],
    toView: "Genre0",
    genreToChineseName: ((v) => {
      let o = {};
      v.forEach(x => o[x[1]] = x[0]);
      return o;
    })(app.globalData.matCategory)
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
      case "selectOriginalMaterial":
        // itemName={{singleItem.itemName}}&itemId={{singleItem.itemId}}&itemDocId={{singleItem._id}}{{navBackExtraData}}
        break;
      default:
        // do nothing
    }
    return;

    // var index = e.currentTarget.dataset.itemIndex;
    // var parentIndex = e.currentTarget.dataset.parentindex;
    // var name = this.data.goods[parentIndex].items[index].name;
    // var mark = 'a' + index + 'b' + parentIndex;
    // var obj = {name: name, index: index, parentIndex: parentIndex};
    // var carArray1 = this.data.carArray.filter(item => item.mark != mark)
    // carArray1.push(obj)
    // //console.log(carArray1);
    // this.setData({
    //   carArray: carArray1,
    //   goods: this.data.goods,
    //   item: this.data.goods[parentIndex].items[index],
    // });
    // const data = e.currentTarget.dataset;
    // console.log("navtoForm",data)
    // wx.navigateTo(data);  
    // wxml中已设置navigator url
  },

  onLoad(options) {
    // this.getDatabase();
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
  selectMenu: function (e) {
    console.log("[selectMenu]", e);
    this.setData({
      toView: e.target.id
    })
  },

  /**
   * fetchItemsData()
   * 调用云函数获取可借用的物资信息
   */
  fetchItemsData() {
    const PAGE = this;
    return wx.cloud.callFunction({
      name: "operateForms",
      data: {
        caller: "fetchItemsData",
        collection: "items",
        filter: {
          "quantityGreaterThan": 0
        },
        operate: "read"
      }
    }).then(res => {
      console.log("[fetchItemsData] res", res);
      if (res.result.err) {
        console.error("[fetchItemsData] error", res.result.err);
        return;
      }

      let x = res.result.data;
      let categorizedItems = {};
      if (x.length) {
        for (let i in x) {
          let itemGenre = x[i].genre;
          if (!categorizedItems[itemGenre]) categorizedItems[itemGenre] = [];
          categorizedItems[itemGenre].push(x[i]);
        }

        console.log("Items", categorizedItems);
        console.log("Genres", Object.keys(categorizedItems));

        PAGE.setData({
          availableItems: categorizedItems,
          availableItemsGenres: Object.keys(categorizedItems)
        });
      }

      //   if (x.length) {
      //     for (let i = 0; i < x.length; i++)
      //       {x[i].eventTime1 = app._toDateStr(new Date(x[i].eventTime1));
      //       x[i].eventTime2 = app._toDateStr(new Date(x[i].eventTime2));}          
      //     PAGE.setData({
      //       apprList: x,
      //       flagGet: x.length ? 2 : 0
      //     });
      //   } else {
      //     PAGE.setData({
      //       apprList: [],
      //       flagGet: 0
      //     });
      //   }
      //   console.log(PAGE.data.apprList);
      // }).catch(err => {
      //   console.error("[newFetchData]failed", err);
    });
  }
})