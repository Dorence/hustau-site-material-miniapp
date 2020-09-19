const cloud = require("wx-server-sdk");
/**
 * initialize cloud
 * @method initialize
 */
cloud.init({
  // env: "cloud-miniapp-96177b",
  env: "release-824dd3",
  traceUser: true
});
/**
 * 调用云数据库
 * @function getDatabase
 */
const db = cloud.database();
/**
 * 表格，获取'xlsx'
 * @method xlsx
 */
const XLSX = require("xlsx");

exports.main = async(event, context) => {
  console.log(event);

  /**
   * check date available
   * @function if data available
   * @returns {object} error(true, message)
   */ 
  if (!event.startDate || !event.endDate || event.startDate > event.endDate) {
    return {
      err: true,
      errMsg: "Invalid date."
    };
  }
  let nameStr = event.startDate + "to" + event.endDate;
  event.startDate = new Date(event.startDate);
  event.endDate = new Date(event.endDate);
  if (!event.startDate || !event.endDate || event.startDate > event.endDate) {
    return {
      err: true,
      errMsg: "Invalid Date."
    };
  }
  console.log("[cloud file name]", nameStr);

  /**
   * check admin state
   * db:get adminInfo 
   * @function admin state
   * @param {number} res.data.length - 时间长度，判断用户状态
   * @returns {boolean} isAdmin
   */
  var isAdmin = await db.collection("adminInfo").where({
    openid: event.openid
  }).get().then(res => {
    return Boolean(res.data.length);
  }).catch(err => {
    return false;
  });
  console.log("[isAdmin]",isAdmin);
  if (!isAdmin) {
    return {
      err: true,
      errMsg: "Promision denied."
    };
  }

  /**
   * get cell data
   * db.command.gte 查询筛选，大于等于
   * @method get array'forms'
   */
  var cellData = await db.collection("forms").where({
    exam: 3,
    submitDate: db.command.gte(event.startDate)
      .and(db.command.lte(event.endDate))
  }).get().then(res => {
    /**
     * 获取单元格数据
     * @returns {array} 暂存数据
     */
    return res.data.reduce((arr, cur) => {
      arr.push([
        cur.formid.toString(), cur.classroomNumber,
        cur.eventDate, cur.eventTime1, cur.eventTime2,
        cur.event.association, cur.event.name, cur.event.content,
        cur.event.responser, cur.event.tel,
        cur.check.approver, cur.check.comment,
        cur.event.attendNumber
      ]);
      return arr;
    }, [
      ["编号", "教室", "借用日期", "起始时间", "结束时间", "部门/社团", "内容", "具体事项", "借用人", "电话", "审批人", "通过情况", "参与人数"]
    ]);
  });
  //console.log(cellData);
  // end get cellData

  /**
   * 获取表格数据？
   */
  var worksheet = XLSX.utils.aoa_to_sheet(cellData);
  console.log("[ws]", worksheet);

  /**
   * begin create workbook
   * @method xlsx.utils.book_new() 创建工作簿
   */
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "导出数据");
  workbook.Props = {
    Title: "社联场地借用汇总",
    Author: "思存工作室",
    Company: "HUSTAU"
  };
  console.log("[wb]", workbook);
  // end create workbook

  /**
   * 加入缓存
   * @method write to Buffer
   */
  var buf = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx"
  });
  //console.log(buf);
  /**
   * 将本地资源上传至云储存空间
   * @method upload
   */
  return await cloud.uploadFile({
    cloudPath: nameStr + ".xlsx",
    fileContent: buf
  });
}