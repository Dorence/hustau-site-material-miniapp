(function () {
    "use strict";
    const CFG = require("./config.js");

    /**
     * facApprResult
     * 申请类型 {{thing5.DATA}}
     * 申请内容 {{thing6.DATA}}
     * 审批结果 {{phrase1.DATA}}
     * 审批说明 {{thing11.DATA}}
     * 申请单号 {{character_string12.DATA}}
     * @param {*} cloud 
     * @param {String} openid 
     * @param {Object} context 
     */
    module.exports.facApprResult = async (cloud, openid, context) => {
        try {
            return await cloud.openapi.subscribeMessage.send({
                lang: "zh_CN",
                miniprogramState: CFG.miniprogramState,
                page: CFG.facIndexPath,
                templateId: CFG.submsgTmplId.apprResult,
                touser: openid,
                data: {
                    thing5: {
                        value: context.thing5.substr(0, 20)
                    },
                    thing6: {
                        value: context.thing6.substr(0, 20)
                    },
                    phrase1: {
                        value: context.phrase1.substr(0, 5)
                    },
                    thing11: {
                        value: context.thing11.substr(0, 20)
                    },
                    character_string12: {
                        value: context.character_string12.substr(0, 32)
                    }
                }
            });
        } catch (err) {
            return err;
        }
    };

    /**
     * facNewAppr
     * 排期 {{character_string1.DATA}}
     * 场地 {{thing2.DATA}}
     * 客户姓名 {{name4.DATA}}
     * 客户电话 {{phone_number3.DATA}}
     * 客户留言 {{thing5.DATA}}
     * @param {*} cloud 
     * @param {String} openid 
     * @param {Object} context 
     */
    module.exports.facNewAppr = async (cloud, openid, context) => {
        try {
            return await cloud.openapi.subscribeMessage.send({
                lang: "zh_CN",
                miniprogramState: CFG.miniprogramState,
                page: CFG.facIndexPath,
                templateId: CFG.submsgTmplId.facNewAppr,
                touser: openid,
                data: {
                    character_string1: {
                        value: context.character_string1.substr(0, 32)
                    },
                    thing2: {
                        value: context.thing2.substr(0, 20)
                    },
                    name4: {
                        value: context.name4.substr(0, 20)
                    },
                    phone_number3: {
                        value: context.phone_number3.substr(0, 17)
                    },
                    thing5: {
                        value: context.thing5.substr(0, 20)
                    }
                }
            });
        } catch (err) {
            return err;
        }
    };
})();