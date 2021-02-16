// 云函数入口文件
const CFG = require("./config.js");

const cloud = require("wx-server-sdk");
cloud.init({
  env: CFG.cloudEnv,
  traceUser: true
});
const db = cloud.database();
const utils = require("./utils.js");
const submsg = require("./message.js");

/**
 * 设置合法的collection名字, 用于检验传入值 
 */
const collectionList = ["formsForMaterials", "items", "addNewMaterials"].concat(
  CFG.dbAdminCollection, CFG.dbFacFormCollection
);

/** 
 * 用于检查 coName 是否是合法的 collection 名
 * @param {String} coName - 待检测的名称
 * @function inCollections
 * @return {Boolean} 是否合法(在数组中)
 */
function inCollections(coName) {
  if (!coName) return false;
  return collectionList.includes(coName);
}

/**
 * toFilter()
 * @param {Object} ft 传入的filter, 可有自定义filter, 详见各个case
 */
function toFilter(ft) {
  /** 检查 ft */
  if (!ft || Object.keys(ft).length === 0) return false;
  let x, obj = {};

  /**
   * loop for all object properties
   */
  for (let s in ft) {
    switch (s) {
      case "exam":
        if (utils.isArray(ft[s])) {
          x = [];
          for (let i in ft[s])
            if (utils.isExamNum(ft[s][i])) x.push(ft[s][i]);
          if (!x.length) return false;
          /**
           * 查询筛选，字段的值在给定的数组内
           * @method db.command.in 
           */
          obj.exam = db.command.in(x);
        } else {
          x = Number(ft[s]);
          if (utils.isExamNum(x)) obj.exam = x;
          else return false;
        }
        break; // exam

      case "openid":
        if (!utils.isIDString(ft[s], [28])) return false;
        obj.openid = ft[s];
        break; // openid

      case "_openid":
        if (!utils.isIDString(ft[s], [28])) return false;
        obj["_openid"] = ft[s];
        break; // _openid

      case "exSubmit":
        x = Number(ft.exSubmit);
        if (isNaN(x)) return false;
        obj.submitDate = db.command.gte(utils.lastDay(x));
        break; // exSubmit

      case "date":
        // eventDate : yyyy-MM-dd
        if (utils.isArray(ft.date)) {
          // [from, to]
          if (ft.date.length !== 2) return false;
          if (!utils.isDateString(ft.date[0]) || !utils.isDateString(ft.date[1]))
            return false;
          obj.eventDate = db.command.gte(ft.date[0])
            .and(db.command.lte(ft.data[0]));
        } else if (utils.isDateString(ft.date)) {
          // exact one day
          obj.eventDate = ft.date;
        } else return false;
        break; // date

      case "quantityGreaterThan":
        x = Number(ft.quantityGreaterThan);
        if (isNaN(x)) return false;
        obj.quantity = db.command.gt(x);
        break;

      case "_id":
        // skip _id field because if using '_id', it's better to use 'doc' mode
        break; // _id

      default:
        obj[s] = ft[s];
    }
  } // end for

  // console.log("[filter]", obj);
  return Object.keys(obj).length > 0 ? obj : false;
}

/**
 * getAllData()
 * @param {ServerSDK.DB.CollectionReference} collect 需要分组获取的 collction
 * @param {Number} offset 从第offset条开始读取
 * @return collection 中所有数据的数组
 */
async function getAllData(collect, offset = 0) {
  const MAX_LIMIT = 100;
  const countRes = await collect.count();
  console.log("[count]", countRes);

  // no result
  if (countRes.total === 0) {
    return {
      data: [],
      errMsg: "collection.get:ok"
    };
  }

  const batch = Math.ceil((countRes.total - offset) / MAX_LIMIT); // batch times
  const tasks = []; // for all promise
  for (let i = 0; i < batch; i++) {
    const promise = collect.skip(i * MAX_LIMIT + offset).limit(MAX_LIMIT).get();
    tasks.push(promise);
  }

  // wait for all done
  return (await Promise.all(tasks)).reduce(
    (acc, cur) => ({
      data: acc.data.concat(cur.data),
      errMsg: cur.errMsg
    })
  );
}

/**
 * 获取用户权限
 * @param {String} openid OPENID
 */
async function getUserPermission(openid) {
  return await db.collection(CFG.dbAdminCollection).where({
    openid: openid
  }).get().then(res => {
    if (res.data.length) {
      return {
        isAdmin: res.data[0].isAdmin,
        isSuper: res.data[0].isSuper
      }
    } else return {
      isAdmin: false
    };
  }).catch(err => {
    return {
      isAdmin: false
    };
  });
}

/**
 * 是否有修改 collection 的权限
 * @param {String} collction 对应的集合
 */
function hasPermission(perm, collction) {
  switch (collction) {
    case CFG.dbAdminCollection:
      return perm.isAdmin && perm.isSuper;
    case CFG.dbFacFormCollection:
      return perm.isAdmin;
    case "formsForMaterials":
      return perm.isAdmin; //NOTE：可能存在两种管理员的问题
    case "items":
      return perm.isAdmin;
    case "addNewMaterials":
      return perm.isAdmin
    default:
      return false;
  }
}

/**
 * "add" 操作主函数
 */
async function addMain(event) {
  // 设置 collection
  if (!inCollections(event.collection))
    return new utils.EMsg("No such collection.");
  let c = db.collection(event.collection);
  let result;

  switch (event.caller) {
    case "newBorrowFac":
      event.add.submitDate = db.serverDate();

      result = await c.orderBy("formid", "desc").limit(2).field({
        formid: true
      }).get();
      // console.log("[result]", result);
      event.add.formid = utils.genFormid(result.data[0] ? result.data[0].formid : "");

      // send subscribed message
      if (event.extrainfo.adminOpenid) {
        const ctx = {
          character_string1: event.add.eventDate + " " + event.add.eventTime1 + "-" + event.add.eventTime2,
          thing2: event.add.classroomNumber,
          name4: event.add.event.responser,
          phone_number3: event.add.event.tel,
          thing5: event.add.event.name + ":" + event.add.event.content.substr(0, 20)
        }
        console.log("[submsg]", await submsg.facNewAppr(cloud, event.extrainfo.adminOpenid, ctx));
      }

      console.log("[event.add]", event.add);
      return await c.add({
        data: event.add
      });
      // end newBorrowFac

    case "newBorrowMat":
      event.add.submitDate = db.serverDate();

      result = await c.orderBy("formid", "desc").limit(2).field({
        formid: true
      }).get();
      // console.log("[result]", result);
      event.add.formid = utils.genFormid(result.data[0] ? result.data[0].formid : "");

      console.log("[event.add]", event.add);
      return await c.add({
        data: event.add
      });
      // end newBorrowFac

    case "newAddItem":
      event.add.submitDate = db.serverDate();

      result = await c.orderBy("formid", "desc").limit(2).field({
        formid: true
      }).get();
      // console.log("[result]", result);
      event.add.formid = utils.genFormid(result.data[0] ? result.data[0].formid : "");

      console.log("[event.add]", event.add);
      return await c.add({
        data: event.add
      });
      // end newAddItem

    default:
      return new utils.EMsg("Caller error.");
  }
}

/**
 * "read" 操作主函数
 */
async function readMain(event) {
  // 设置 collection
  if (!inCollections(event.collection))
    return new utils.EMsg("No such collection.");
  let c = db.collection(event.collection);

  // 设置取值
  if (event.isDoc) {
    // 取单个记录
    if (!utils.isIDString(event.docID, [16, 32, 36]))
      return {
        err: true,
        errMsg: "Error docID format.",
        doc: event.docID
      };
    c = c.doc(event.docID);
  } else {
    // 取所有记录
    const filter = toFilter(event.filter);
    if (filter === false)
      return new utils.EMsg("Error filter.");
    c = c.where(filter);
  }

  // 设置返回字段
  if (event.hasOwnProperty("field") && Object.keys(event.field).length)
    c = c.field(event.field);

  // 获取数据并返回
  if (event.isDoc) {
    return c.get();
  } else {
    const offset = Number(event.offset);
    return await getAllData(c, isNaN(offset) ? 0 : Number(offset));
  }
}

/**
 * generate update object
 * @param {Object} event 
 * @param {String[]} keywords array of check keys
 */
function toUpdateObj(event, keywords) {
  const u = event.update;
  // console.log("[toUpdateObj]openid", event.openid);
  let o = {
    check: {
      openid: event.openid
    }
  };

  // 检查 check
  if (u.check && Object.keys(u.check).length) {
    keywords.forEach(val => {
      if (u.check.hasOwnProperty(val)) o.check[val] = u.check[val];
    });
    o.check.time = db.serverDate();
  } else
    return new utils.EMsg("Error check.");

  // 检查 exam
  if (utils.isExamNum(u.exam)) o.exam = u.exam;
  else return new utils.EMsg("Error exam.");

  // updateMatBorrowAppr 可能更新归还数量
  if (event.caller === "updateMatBorrowAppr") {
    if (u.hasOwnProperty("returnQuantity"))
      o.returnQuantity = u.returnQuantity;
  }

  // 更新历史记录
  let tmp = o.check;
  tmp.exam = o.exam;

  if (o.hasOwnProperty("returnQuantity"))
    tmp.returnQuantity = o.returnQuantity;

  o.checkHis = db.command.push([tmp]);

  console.log("[update object]", o);
  return {
    data: o
  };
}

/**
 * "update" 操作主函数
 */
async function updateMain(event) {
  // 设置 collection
  if (!inCollections(event.collection))
    return new utils.EMsg("No such collection.");
  let c = db.collection(event.collection);

  // 设置取值
  if (event.isDoc) {
    // 取单个记录
    if (!utils.isIDString(event.docID, [16, 32, 36]))
      return {
        err: true,
        errMsg: "Error docID format.",
        doc: event.docID
      };
    c = c.doc(event.docID);
  } else {
    // 取所有记录
    const filter = toFilter(event.filter);
    if (filter === false)
      return new utils.EMsg("Filter error.");
    c = c.where(filter);
  }

  // 对于不同的 caller 可有不同的操作
  let updateObj;
  switch (event.caller) {
    case "updateNewMatAppr":
      updateObj = toUpdateObj(event, ["approver", "comment"]);
      if (updateObj.err) return updateObj;

      /** @todo send subscribed message */
      return await c.update(updateObj).then(res => {
        console.log("[update]", res);
        return {
          err: false,
          errMsg: res.errMsg,
          updated: res.stats.updated
        }
      });
      // end updateNewMatAppr

    case "updateMatBorrowAppr": {
      let item = event.extrainfo.itemDoc;
      if (!utils.isIDString(item, [16, 32, 36]))
        return new utils.EMsg("Cannot index item.");
      item = db.collection(CFG.dbMatItemsCollection).doc(item);

      updateObj = toUpdateObj(event, ["borrowApprover", "borrowComment", "returnApprover", "returnComment"]);
      if (updateObj.err) return updateObj;

      /** @todo send subscribed message */
      switch (updateObj.data.exam) {
        case 4: // 审核时拒绝，物资不变化
          break;
        case 5: // 同意后撤销，移去物资（减少）
          await item.update({
            data: {
              quantity: db.command.inc(-updateObj.data.returnQuantity) // negative
            }
          });
          break;
        case 6: // 审核时同意，补回物资（增加）
          await item.update({
            data: {
              quantity: db.command.inc(updateObj.data.returnQuantity) // positive
            }
          });
          break;
        case 1:
        case 2:
        case 3:
          break; // 借用审核，物资不变化
        default:
          return new utils.EMsg("Invalid exam.");
      }

      return await c.update(updateObj).then(res => {
        console.log("[update]", res);
        return {
          err: false,
          errMsg: res.errMsg,
          updated: res.stats.updated
        }
      });
    } // end updateMatBorrowAppr

    case "updateFacAppr":
      updateObj = toUpdateObj(event, ["approver", "comment"]);
      if (updateObj.err) return updateObj;

      // send subscribed message
      console.log("[submsg]", await submsg.facApprResult(cloud, event.openid, event.extrainfo));
      updateObj.data.isSubMsg = false; // 消息订阅仅能启用一次

      return await c.update(updateObj).then(res => {
        console.log("[update]", res);
        return {
          err: false,
          errMsg: res.errMsg,
          updated: res.stats.updated
        }
      });
      // end updateFacAppr

    case "addMaterials":
      // console.log("[update]", c)
      return await db.collection(event.collection).doc(event.docID).update({
        data: {
          quantity: db.command.inc(event.update.addQuantity)
        }
      }).catch(console.error)
      // end addMaterials

    case "superUpdateUser":
      console.info("[userList]", event.update.userList, "[c]", c._id);
      return await c.update({
        data: event.update
      }).then(res => {
        console.log("[update superUpdateUser]", res);
        return {
          err: false,
          errMsg: res.errMsg,
          updated: res.stats.updated
        }
      });
      // end superUpdateUser

    default:
      return new utils.EMsg("Caller error.");
  }
}

/**
 * confirm borrow
 * @param {Object} event 
 */
async function confirmBorrowMain(event) {
  // 设置 collection
  if (!inCollections(event.collection))
    return new utils.EMsg("No such collection.");
  let c = db.collection(event.collection);

  if (!event.isDoc)
    return new utils.EMsg("Must be doc.");
  c = c.doc(event.docID);

  // 借出物品
  await db.collection(CFG.dbMatItemsCollection).doc(event.update.itemDoc)
    .update({
      data: {
        quantity: db.command.inc(-event.update.quantity) // negative
      }
    });

  return await c.update({
    data: {
      confirmBorrowTime: db.serverDate(),
      exam: event.update.exam
    }
  }).then(res => {
    console.log("[confirmBorrowMain]", res);
    return {
      err: false,
      errMsg: res.errMsg,
      updated: res.stats.updated
    }
  });
}

/**
 * "bindUser" 操作主函数
 */
async function bindUserMain(event) {
  // 设置 collection
  if (!inCollections(event.collection))
    return new utils.EMsg("No such collection");
  let c = db.collection(event.collection);

  // 设置 管理员openid
  if (!utils.isIDString(event.filter.superOpenid, [28])) return new utils.EMsg("Invalid user.");
  return await c.where({
    openid: event.filter.superOpenid
  }).limit(1).get().then(resSuper => {
    /** cb of get */
    console.log("[super]", resSuper);

    if (resSuper.data && resSuper.data.length === 1) {
      let superUser = resSuper.data[0],
        l = superUser.tokens.length;

      for (let i = 0; i < l; i++)
        if (superUser.tokens[i].key === event.filter.key) {
          // token found
          superUser.tokens[i].key = "expired=" + (new Date().getTime()) + ";" + Math.random();
          superUser.tokens[i].name = event.update.name;
          superUser.tokens[i].tel = event.update.tel;
          superUser.tokens[i].openid = event.openid;

          // update superUser
          return c.doc(superUser._id).update({
            data: {
              tokens: superUser.tokens
            }
          }).then(retUpdate => {
            /** return of update superUser */
            console.log("[update super]", retUpdate);
            if (retUpdate.stats.updated === 1) {
              return c.where({
                openid: event.openid
              }).count().then(resCnt => {
                console.log("[update count]", resCnt);
                if (resCnt.total > 0) {
                  // User existed, update a doc
                  return c.where({
                    openid: event.openid
                  }).update({
                    data: {
                      name: event.update.name,
                      openid: event.openid,
                      tel: event.update.tel,
                      isAdmin: superUser.tokens[i].isAdmin
                    }
                  }).then(res => {
                    console.log("[update user]", res);
                    return {
                      err: false,
                      errMsg: res.errMsg,
                      updated: res.stats.updated
                    }
                  }).catch(err => {
                    console.error("[update user err]", err);
                    return new utils.EMsg(err.errMsg);
                  });
                } else {
                  // User does not exist, add a doc
                  return c.add({
                    data: {
                      name: event.update.name,
                      openid: event.openid,
                      tel: event.update.tel,
                      isAdmin: superUser.tokens[i].isAdmin
                    }
                  }).then(res => {
                    console.log("[add user]", res);
                    return {
                      err: false,
                      updated: 1,
                      errMsg: res.errMsg
                    }
                  }).catch(err => {
                    console.error("[add user err]", err);
                    return new utils.EMsg(err.errMsg);
                  });
                }
              });
            } else return new utils.EMsg("Write database error.");
            /** end return of update superUser */
          });
        }
      /** end for */

      return new utils.EMsg("Invalid request."); // not found
    } else {
      return new utils.EMsg("Invalid user.");
    }
    /** end cb of get */
  });
}

/**
 * "remove" 操作主函数
 */
async function removeMain(event) {
  // 设置 collection
  if (!inCollections(event.collection))
    return new utils.EMsg("No such collection");
  let c = db.collection(event.collection);

  // 设置取值
  if (event.isDoc) {
    // 删除单个记录
    if (!utils.isIDString(event.docID, [16, 32, 36]))
      return {
        err: true,
        errMsg: "Error docID format.",
        doc: event.docID
      };
    c = c.doc(event.docID);
  } else {
    // 删除多条记录
    const filter = toFilter(event.filter);
    if (filter === false) return new utils.EMsg("Filter error.");
    c = c.where(filter);
  }

  // 对于不同的 caller 可有不同的操作 
  switch (event.caller) {
    case "superRemoveUser":
      return await c.remove().then(res => {
        console.log("[remove]", res);
        return {
          err: false,
          errMsg: res.errMsg,
          removed: res.stats.removed
        }
      });
      // end superRemoveUser

    default:
      return new utils.EMsg("Caller error.");
  }
}

/**
 * 云函数入口函数
 * @param {Object} event - 传入参数
 * @param {Object} [event.add] - (operate=add时必填)新增记录的内容
 * @param {String} event.caller - 用于标识调用者
 * @param {String} event.collection - 需要操作的数据库集合
 * @param {String} [event.docID] - (isDoc=true时必填) 表示需查询项的 _id
 * @param {Object} [event.field] - 需要返回的关键字段表. 1)无法设置对象内的field, 即 `event: {name: true}` 与 `event: true` 作用相同. 2)返回的数据默认有 `_id`, 不需在field中
 * @param {Object} [event.filter] - (isDoc=false时必填) 查询条件
 * @param {Boolean} [event.isDoc] - 是否使用 doc() 方法获取一个数据
 * @param {String} event.operate - 操作, 目前只支持 read, update
 * @param {Object} [event.update] - (operate=update时必填)更新对象
 * @param {Object} [event.extrainfo] - 额外的信息
 * @return { {data: Object[], errMsg: String} | {err: Boolean, errMsg: String} }
 */
exports.main = async (event, context) => {
  console.log("[event]", event);
  if (!event.caller)
    return {
      err: true,
      errMsg: "Invalid caller."
    };

  event.openid = event.userInfo.openId || cloud.getWXContext().OPENID;

  switch (event.operate) {
    case "add":
      return await addMain(event);
      // end add

    case "read": // 获取数据表
      return await readMain(event);
      // end read

    case "update":
      const perm = await getUserPermission(event.openid);
      console.log("[permission]", perm);
      if (hasPermission(perm, event.collection)) return await updateMain(event);
      else return new utils.EMsg("Permission denied.")
      // end update

    case "confirmBorrow":
      return await confirmBorrowMain(event);

    case "bindUser":
      return await bindUserMain(event);
      // end bindUser

    case "remove":
      const permRv = await getUserPermission(event.openid);
      console.log("[permission]", permRv);
      if (hasPermission(permRv, event.collection)) return await removeMain(event);
      else return new utils.EMsg("Permission denied.");
      // end remove

    default:
      return new utils.EMsg("Unknown operate.");
  }
}