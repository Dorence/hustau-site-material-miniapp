(function () {
    "use strict";
    let config = {
        appFullName: "HUST社指36号楼场地及物资借用",
        contactEmail: "bangongshi_hustag@163.com",

        cloudEnv: "release-824dd3",
        // cloudEnv: "cloud-miniapp-96177b",
        miniprogramState: "developer", // developer, trial, formal
        submsgTmplId: {
            apprResult: "jEKykTnvIomfpyZDaqc73JiNOierWcA3HuD_nf2vDfo", // approval result template id
            facNewAppr: "Z6QUlypDmcBzh2nQOFEBnvf8GXZpY4UgXZnZoFsI2cs" // new facilities approval template id
        },
        
        // admin
        dbAdminCollection: "adminInfo", // database for admin info

        // facilities
        dbFacFormCollection: "forms", // database for facilities forms
        facExamStr: ["未审批", "撤回", "未通过", "通过"],
        facIndexPath: "pages/facilities/index",
        facRoomList: ["201", "205", "207", "208"], // available rooms
        
        // materials
        dbMatAddItemCollection: "addNewMaterials",
        dbMatBorrowCollection: "formsForMaterials",
        dbMatItemsCollection: "items",
        matCategory: [
            ["服饰类", "A"],
            ["宣传类", "B"],
            ["奖品类", "C"],
            ["工具类", "D"],
            ["装饰类", "E"],
            ["文本类", "F"],
            ["其他", "G"],
        ],
        matExamStr: ["未审批", "撤回", "未通过", "允许借用", "待归还", "核销中", "已归还"],
        matExamAddStr: ["未审批", "已审批"],
        matIndexPath: "pages/materials/index",
        matLocation: [
            ["无仓库", "一号仓库", "二号仓库", "三号仓库", "四号仓库"], // room
            ["无货架", "货架1", "货架2", "货架3", "货架4", "货架5", "货架6"], // shelf
            ["无分区", "分区A", "分区B", "分区C", "分区D", "分区E"] // section
        ]
    };

    for (let item in config)
        module.exports[item] = config[item];
})();