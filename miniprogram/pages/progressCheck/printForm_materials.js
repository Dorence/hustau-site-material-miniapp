const db = wx.cloud.database();

Page({
  data: {
    examState: ["未审批", "撤回", "未通过", "通过"],
    progressList: [],
    WIDTH: 375,
    HEIGHT: 550
  },

  onLoad: function(options) {
    const PAGE = this;
    // console.log("options:" + options.type +' - ' + options.id);
    db.collection("formsForMaterials").where({
      _id: options.id
    }).get({
      success(e) {
        PAGE.setData({
          progressList: e.data || []
        });
        PAGE.createNewImg(PAGE);
      },
      fail: console.error
    });
  },


  createNewImg: function(PAGE) {
    var it = PAGE.data.progressList[0];
    // console.log('item:',it);
    let ctx = wx.createCanvasContext('formVerify1');
    ctx.setFillStyle('white')
    ctx.fillRect(0, 0, PAGE.data.WIDTH, PAGE.data.HEIGHT);
    // ctx.draw();
    // ctx.setStrokeStyle('black')
    // ctx.moveTo(0, 0)
    // ctx.lineTo(210, 0)
    // ctx.stroke()
    ctx.setLineWidth = 20;
    ctx.setStrokeStyle = "blue";
    ctx.moveTo(15, 5);
    ctx.lineTo(360, 5);
    ctx.stroke();
    ctx.setFillStyle('black')
    ctx.font = "18px sans-serif";
    ctx.setTextAlign('start');
    // ctx.fillText("textAlign=start",30,20);
    let contentForPrint = {
      "协会名称": it.association,
      "物资名称": it.itemName,
      "借用日期": it.eventTime1,
      "归还时间": it.eventTime2,
      "借用物资编号": it.itemId,
      "借用负责人": it.name,
      "联系电话": it.phoneNumber,
      "审批状态": PAGE.data.examState[it.exam],
      "社指审批人": it.check.approver
    };
    var yCoord = 25;

    for (var title in contentForPrint) {
      ctx.fillText(title, 25, yCoord);
      var textWidth = ctx.measureText(contentForPrint[title]).width;
      var maxLength = 200;
      // console.log(textWidth);
      var lastYCoord = yCoord;
      if (textWidth <= maxLength) {
        ctx.fillText(contentForPrint[title], 155, yCoord);
      } else if (textWidth < 600) {
        var count = 0;

        while (textWidth > maxLength) {
          var currentText = contentForPrint[title];
          ctx.fillText(currentText.substring(count * 10, (count + 1) * 10), 160, yCoord);

          count++;
          yCoord += 25;
          textWidth -= 200;
        }
      } else {
        var count = 0;
        var lastYCoord = yCoord;
        while (count < 3) {
          var currentText = contentForPrint[title];
          ctx.fillText(currentText.substring(count * 11, (count + 1) * 11), 155, yCoord);

          count++;
          yCoord += 25;
          textWidth -= 200;
        }
        ctx.fillText("......", 155, yCoord);
      }

      ctx.moveTo(15, lastYCoord - 20)
      ctx.lineTo(15, yCoord + 5);
      ctx.lineTo(360, yCoord + 5);
      ctx.lineTo(360, lastYCoord - 20);
      ctx.moveTo(150, lastYCoord - 20);
      ctx.lineTo(150, yCoord + 5)
      ctx.stroke();
      ctx.moveTo(15, yCoord + 5);
      yCoord += 25;
    }

    ctx.draw();

  },

  savePic: function() {
    wx.canvasToTempFilePath({
      canvasId: 'formVerify1',
      success: function(res) {
        // console.log(res.tempFilePath)
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: (res) => {
            console.log('successfully saved:', res)
            wx.showModal({
              title: '保存成功',
              content: "已保存到手机相册",
              showCancel: false,
              confirmText: '好',
            })
          },
          fail: function(res) {
            console.log(res)
            wx.getSetting({
              success: function(res) {
                console.log(res.authSetting)
                if (("scope.writePhotosAlbum" in res.authSetting) && !res.authSetting['scope.writePhotosAlbum']) {
                  console.log("auth fail")
                  this.setData({
                    opentype: "openSetting"
                  })
                }
              }
            })
          }
        })
        // that.data.tmpPath = res.tempFilePath
      },
    })
  }

})