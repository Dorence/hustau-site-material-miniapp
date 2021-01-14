(function () {
    let config = {
        appFullName: "HUST社指36号楼场地及物资借用",
        classroomList: ["201", "205", "207", "208"],
        contactEmail: "bangongshi_hustag@163.com",
        matCategory: [
            ["服饰类", "A"],
            ["宣传类", "B"],
            ["奖品类", "C"],
            ["工具类", "D"],
            ["装饰类", "E"],
            ["文本类", "F"],
            ["其他", "G"],
        ],
        dbFacFormCollection: "forms", // database for facilities forms

    };

    for (let item in config)
        module.exports[item] = config[item];
})();