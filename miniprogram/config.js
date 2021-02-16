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
        matIndexPath: "pages/materials/index"
    };

    for (let item in config)
        module.exports[item] = config[item];
})();