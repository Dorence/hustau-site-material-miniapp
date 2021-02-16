(function () {
    "use strict";
    const CFG = require("./config.js");

    // limit of keywords
    const CHSTR_LEN = 32; // maximum length of character string
    const NAME_LEN = 20; // maximum length of name
    const PHONE_LEN = 17; // maximum length of phone number
    const PHRASE_LEN = 5; // maximum length of phrase
    const THING_LEN = 20; // maximum length of thing

    /**
     * 限制字符串长度且非空
     * @param {any} str 待处理字符串
     * @param {Number} len 最长长度
     * @param {String} emptyVal 空字符串时返回值
     */
    function limitStr(str, len = THING_LEN, emptyVal = "无") {
        str = str.toString().substr(0, len);
        return str.length ? str : emptyVal;
    }

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
                        value: limitStr(context.thing5, THING_LEN)
                    },
                    thing6: {
                        value: limitStr(context.thing6, THING_LEN)
                    },
                    phrase1: {
                        value: limitStr(context.phrase1, PHRASE_LEN)
                    },
                    thing11: {
                        value: limitStr(context.thing11, THING_LEN)
                    },
                    character_string12: {
                        value: limitStr(context.character_string12, CHSTR_LEN)
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
                        value: limitStr(context.character_string1, CHSTR_LEN)
                    },
                    thing2: {
                        value: limitStr(context.thing2, THING_LEN)
                    },
                    name4: {
                        value: limitStr(context.name4, NAME_LEN)
                    },
                    phone_number3: {
                        value: limitStr(context.phone_number3, PHONE_LEN)
                    },
                    thing5: {
                        value: limitStr(context.thing5, THING_LEN)
                    }
                }
            });
        } catch (err) {
            return err;
        }
    };
})();