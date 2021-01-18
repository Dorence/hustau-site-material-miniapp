(function () {
    let config = {
        appFullName: "HUST社指36号楼场地及物资借用",
        contactEmail: "bangongshi_hustag@163.com",

        // facilities
        facRoomList: ["201", "205", "207", "208"],
        dbFacFormCollection: "forms", // database for facilities forms
        facExamStr: ["未审批", "撤回", "未通过", "通过"],

        // materials
        matCategory: [
            ["服饰类", "A"],
            ["宣传类", "B"],
            ["奖品类", "C"],
            ["工具类", "D"],
            ["装饰类", "E"],
            ["文本类", "F"],
            ["其他", "G"],
        ],
        matExamStr: ["未审批", "撤回", "未通过", "已借出", "待归还", "已归还"],
    };

    for (let item in config)
        module.exports[item] = config[item];
})();