(function () {
    let config = {
        appFullName: "HUST社指36号楼场地及物资借用",
        classroomList: ["201", "205", "207", "208"],
        contactEmail: "bangongshi_hustag@163.com"
    };

    for(let item in config)
        module.exports[item] = config[item];
})();