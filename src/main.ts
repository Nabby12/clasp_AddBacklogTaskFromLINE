const LINE_CHANNEL_ACCESSTOKEN: string = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESSTOKEN');
const TASKKEY_PLAN: string = PropertiesService.getScriptProperties().getProperty('TASKKEY_PLAN');
const TASKKEY_TASK: string = PropertiesService.getScriptProperties().getProperty('TASKKEY_TASK');
const TASKKEY_ANXIOUS: string = PropertiesService.getScriptProperties().getProperty('TASKKEY_ANXIOUS');
const TASKKEY_REQUEST: string = PropertiesService.getScriptProperties().getProperty('TASKKEY_REQUEST');
const TASKKEY_WORRY: string = PropertiesService.getScriptProperties().getProperty('TASKKEY_WORRY');
const TASKKEY_OTHER: string = PropertiesService.getScriptProperties().getProperty('TASKKEY_OTHER');
const TASKID_PLAN: string = PropertiesService.getScriptProperties().getProperty('TASKID_PLAN');
const TASKID_TASK: string = PropertiesService.getScriptProperties().getProperty('TASKID_TASK');
const TASKID_ANXIOUS: string = PropertiesService.getScriptProperties().getProperty('TASKID_ANXIOUS');
const TASKID_REQUEST: string = PropertiesService.getScriptProperties().getProperty('TASKID_REQUEST');
const TASKID_WORRY: string = PropertiesService.getScriptProperties().getProperty('TASKID_WORRY');
const TASKID_OTHER: string = PropertiesService.getScriptProperties().getProperty('TASKID_OTHER');
const LINE_GET_SCHEDULE_KEYWORD: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_SCHEDULE_KEYWORD');
const LINE_GET_SCHEDULE_DATEWORD1: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_SCHEDULE_DATEWORD1');
const LINE_GET_SCHEDULE_DATEWORD2: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_SCHEDULE_DATEWORD2');
const LINE_GET_SCHEDULE_DATEWORD3: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_SCHEDULE_DATEWORD3');
const LINE_GET_SCHEDULE_REPLYWORDSTART: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_SCHEDULE_REPLYWORDSTART');
const LINE_GET_SCHEDULE_REPLYWORDEND: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_SCHEDULE_REPLYWORDEND');
const LINE_GET_NOSCHEDULE_REPLYWORD: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_NOSCHEDULE_REPLYWORD');
const LINE_GET_SCHEDULE_ERRORREPLYWORD: string = PropertiesService.getScriptProperties().getProperty('LINE_GET_SCHEDULE_ERRORREPLYWORD');
const LINE_REPLYWORD0: string = PropertiesService.getScriptProperties().getProperty('LINE_REPLYWORD0');
const LINE_KEYWORD1: string = PropertiesService.getScriptProperties().getProperty('LINE_KEYWORD1');
const LINE_REPLYWORD1: string = PropertiesService.getScriptProperties().getProperty('LINE_REPLYWORD1');
const LINE_KEYWORD2: string = PropertiesService.getScriptProperties().getProperty('LINE_KEYWORD2');
const LINE_REPLYWORD2: string = PropertiesService.getScriptProperties().getProperty('LINE_REPLYWORD2');
const ADD_MESSAGE_START: string = PropertiesService.getScriptProperties().getProperty('ADD_MESSAGE_START');
const ADD_MESSAGE_END: string = PropertiesService.getScriptProperties().getProperty('ADD_MESSAGE_END');
const BACKLOG_API_TOKEN: string = PropertiesService.getScriptProperties().getProperty('BACKLOG_API_TOKEN');
const BACKLOG_SPACE_KEY: string = PropertiesService.getScriptProperties().getProperty('BACKLOG_SPACE_KEY');
const BACKLOG_PROJECT_ID: string = PropertiesService.getScriptProperties().getProperty('BACKLOG_PROJECT_ID');
const BACKLOG_ASSIGNEE_ID: string = PropertiesService.getScriptProperties().getProperty('BACKLOG_ASSIGNEE_ID');
const ERROR_MESSAGE_FOR_PLAN: string = PropertiesService.getScriptProperties().getProperty('ERROR_MESSAGE_FOR_PLAN');
const BR_STR: string = PropertiesService.getScriptProperties().getProperty('BR_STR');

function doPost(e: string) {
    let event = JSON.parse(e.postData.contents).events[0];
    let replyToken: string = event.replyToken;

    if (typeof replyToken === 'undefined') {
        throw new Error('undefined Token');
    }

    if (event.type != 'message') {
        return;
    }

    let userMessage: string = event.message.text.trim().replace(/　/g, ' ');
    // let userId: string = event.source.userId; // 担当者登録などで使うときがあったら
    // let groupId = event.source.groupId; // グループID取得で使うときがあったら
    // let roomId = event.source.roomId; // ルームID取得で使うときがあったら
    // sendMessageToLINE(replyToken, `userId:${ userId } \n groupId:${ groupId }$ \n roomId:${ roomId }`);

    let taskKeyAry: string[] = [
        TASKKEY_PLAN,
        TASKKEY_TASK,
        TASKKEY_ANXIOUS,
        TASKKEY_REQUEST,
        TASKKEY_WORRY,
        TASKKEY_OTHER,
    ];
    let taskIdAry: string[] = [
        TASKID_PLAN,
        TASKID_TASK,
        TASKID_ANXIOUS,
        TASKID_REQUEST,
        TASKID_WORRY,
        TASKID_OTHER,
    ];

    let trgtKey: string = '';
    let trgtId: string = '';
    taskKeyAry.some((value, index) => {
        if(userMessage.startsWith(value)) {
            trgtKey = value;
            trgtId = taskIdAry[index]
            return true;
        }
    });
    
    // 課題登録以外の追加機能
    if (trgtKey === '') {
        // 予定の確認
        if (userMessage.indexOf(LINE_GET_SCHEDULE_KEYWORD) != -1) {
            SendScheduleReplyToLINE(replyToken, userMessage)
        }

        let otherWordsAry: string[] = [
            LINE_KEYWORD1,
            LINE_KEYWORD2,
        ];
        let replyAry: string[] = [
            LINE_REPLYWORD1,
            LINE_REPLYWORD2,
        ];

        let trgtIndex: number = -1;
        otherWordsAry.some((value, index) => {
            if(userMessage.indexOf(value) != -1) {
                trgtIndex = index;
                return true;
            }
        });

        if (trgtIndex === -1) {
            // 指定のワード全てに合致しない場合の返信
            sendMessageToLINE(replyToken, LINE_REPLYWORD0);
            return;
        }

        let replyWord: string = replyAry[trgtIndex];

        ReplyMessageBySubKeywords(replyToken, replyWord)
    }

    AddTaskToBacklog(replyToken, userMessage, trgtKey, trgtId)
}

function AddTaskToBacklog(replyToken: string, userMessage: string, trgtKey: string, trgtId: string) {
    let taskTitle: string = userMessage.replace(trgtKey, '').trim();

    // plan の時は yyyymmdd 形式かどうか判定 + hhmm 形式で時間が入っていれば不正値かどうか判定（「時間」は省略可）
    let trgtDateStr: any = '';
    if (trgtKey === TASKKEY_PLAN) {
        let body = userMessage.replace(trgtKey,'').trim()
        let trgtAry: string[]
        if (body.indexOf(' ') < 0 ) {
            trgtAry = [body.substring(0, 8).toString(), body.substring(8 ,12).toString(), body.substring(12).toString()];
        } else {
            trgtAry = body.split(' ')
        }
        trgtDateStr = trgtAry[0].toString();
        if (trgtDateStr.length === 8 && !isNaN(trgtDateStr)) {
            trgtDateStr = trgtDateStr.substring(0, 4) + '-' + trgtDateStr.substring(4, 6) + '-' + trgtDateStr.substring(6, 8);
        }

        // yyyymmdd　を取り除く
        taskTitle = taskTitle.replace(trgtAry[0],'').trim();
        
        // 二つ目の引数に数値を設定している時のみ形式判定
        if (trgtAry.length > 2) {
            let trgtTime: any = '';
            trgtTime = trgtAry[1].toString();
            if (!isNaN(trgtTime)) {
                if (trgtTime.length !=4 || trgtTime.substring(0, 2) > 24 || trgtTime.substring(2, 4) > 59) {
                    sendMessageToLINE(replyToken, ERROR_MESSAGE_FOR_PLAN);
                }
            }
        }
        if (trgtDateStr === '') {
            sendMessageToLINE(replyToken, trgtDateStr + 2 + ERROR_MESSAGE_FOR_PLAN);
        }
    // task の時は yyyymmdd 形式で日付があるかを判定（「日付」は省略可）
    } else if (trgtKey === TASKKEY_TASK) {
        let body = userMessage.replace(trgtKey,'').trim()
        let trgtAry: string[]
        if (body.indexOf(' ') < 0 ) {
            trgtAry = [body.substring(0, 8).toString(), body.substring(8).toString()];
        } else {
            trgtAry = body.split(' ')
        }
        trgtDateStr = trgtAry[0].toString();
        if (trgtDateStr.length === 8 && !isNaN(trgtDateStr)) {
            trgtDateStr = trgtDateStr.substring(0, 4) + '-' + trgtDateStr.substring(4, 6) + '-' + trgtDateStr.substring(6, 8);
                   
            // yyyymmdd　を取り除く
            taskTitle = taskTitle.replace(trgtAry[0],'').trim();

        } else {
            trgtDateStr = ''
        }
    }

    // add-backlog-task
    AddBacklogTask(trgtId, taskTitle, trgtDateStr);

    let replyMessage: string = ADD_MESSAGE_START + trgtKey + '：' + taskTitle + ADD_MESSAGE_END;
    
    // reply-message
    sendMessageToLINE(replyToken, replyMessage);
}
function AddBacklogTask(trgtId: string, taskTitle: string, trgtDateStr: string)  {
    let BACKLOG_HTTPREQUEST_ADD_ISSUE: string = 'https://' + BACKLOG_SPACE_KEY + '.backlog.com/api/v2/issues?apiKey=' + BACKLOG_API_TOKEN;
    let param = {
        "method": "post"
    };

    let issue = {
        "projectId": BACKLOG_PROJECT_ID,
        "issueTypeId": trgtId,
        "summary": taskTitle,
        "priorityId": 3,
        "dueDate": trgtDateStr,
        "assigneeId": BACKLOG_ASSIGNEE_ID,
    };

    let request = UrlFetchApp.fetch(BACKLOG_HTTPREQUEST_ADD_ISSUE　+ '&' + createQuery(issue), param);

    return JSON.parse(request.getContentText());
}
function createQuery(param) {
    let query = [];
    for(let key in param) {
      query.push(key + '=' + encodeURI(param[key]))
    };
    return query.join('&');
}


function SendScheduleReplyToLINE(replyToken: string, userMessage: string) {
    let scheduleWordPosition: number = userMessage.indexOf(LINE_GET_SCHEDULE_KEYWORD);
    let dateStr: any = userMessage.substring(0, scheduleWordPosition);

    let dateErrFlg: boolean = false;
    let trgtDate: Date = new Date();
    switch (dateStr) {
        case LINE_GET_SCHEDULE_DATEWORD1:
            break;
        case LINE_GET_SCHEDULE_DATEWORD2:
            trgtDate.setDate(trgtDate.getDate() + 1);
            break;
        default:
            if(dateStr.indexOf(LINE_GET_SCHEDULE_DATEWORD3) != -1){
                let buf: any = dateStr.substring(0, dateStr.length - LINE_GET_SCHEDULE_DATEWORD3.length);
                if (isNaN(buf)) {
                    dateErrFlg = true;
                    break;
                };

                trgtDate.setDate(trgtDate.getDate() + parseInt(buf));
                break;
            }
            
            if (dateStr.length != 8 || isNaN(dateStr)) {
                dateErrFlg = true;
                break;
            } else if (dateStr.substring(4, 6) > 12 || dateStr.substring(6, 8) > 31) {
                dateErrFlg = true;
                break;
            }

            dateStr = dateStr.substring(0, 4) + '/' + dateStr.substring(4, 6) + '/' + dateStr.substring(6, 8);
            let dateAry: number[] = dateStr.split('/');

            trgtDate = new Date(dateAry[0], dateAry[1] - 1, dateAry[2]);
            break;
    }

    if (dateErrFlg === true) {
        sendMessageToLINE(replyToken, LINE_GET_SCHEDULE_ERRORREPLYWORD);
    }

    let trgtMonth: number = trgtDate.getMonth() + 1;
    let trgtMonthStr: string = "0" + trgtMonth;
    let trgtDayStr: string = "0" + trgtDate.getDate()
    let dueDate: string = trgtDate.getFullYear() + "-" + trgtMonthStr.slice(-2) + "-" + trgtDayStr.slice(-2);

    let trgtUrl: string = "https://" + BACKLOG_SPACE_KEY + ".backlog.com/api/v2/issues?apiKey=" + BACKLOG_API_TOKEN;
    let trgtStatus = {
        "projectId[]": BACKLOG_PROJECT_ID,
        "statusId[]": 1,
        "sort": "dueDate",
        "order": '',
        "count": 100,
        // "dueDateSince": dueDate,
        "dueDateUntil": dueDate,
    };

    let responseIssue = UrlFetchApp.fetch(trgtUrl + '&' + createQuery(trgtStatus));
    if (responseIssue.getResponseCode() != 200) {
        return;
    }

    let issueList = JSON.parse(responseIssue.getContentText());

    if (issueList.length < 1) {
        let replyBody: string = dateStr + LINE_GET_NOSCHEDULE_REPLYWORD;
        sendMessageToLINE(replyToken, replyBody)
    }

    let replyMessage: string;
    for (let i = 0; i < issueList.length; i++) {
        let dueDateStr: string = issueList[i]["dueDate"]
        let dueDateStrAry: string[] = dueDateStr.substring(0,10).split('-')
        
        let trgtIssueStr: string = issueList[i]["issueType"]["name"] + '：' + issueList[i]["summary"]
                                    + '（期限：' + dueDateStrAry[0] + '/' + dueDateStrAry[1] + '/' + dueDateStrAry[2]+ '）';
        
        if (i === 0) {
            replyMessage = trgtIssueStr;
        } else {
            replyMessage += '\n' + trgtIssueStr;
        }
    }

    let replyMessageAry: string[] = [
        dateStr + LINE_GET_SCHEDULE_REPLYWORDSTART,
        replyMessage,
        LINE_GET_SCHEDULE_REPLYWORDEND,
    ];

    sendMessageToLINE(replyToken, replyMessageAry);
}


function ReplyMessageBySubKeywords(replyToken: string, replyWord: String) {
    let replyMessageAry: string[] = replyWord.split(BR_STR)
    sendMessageToLINE(replyToken, replyMessageAry)
}


function sendMessageToLINE(token: string, sendBody) {
    let messageBody: any[];
    if (Object.prototype.toString.call(sendBody) === '[object Array]') {
        for (let i = 0; i < sendBody.length; i++) {
            if (i < 1) {
                messageBody = [
                    {type: 'text', text: sendBody[i]}
                ];
            } else {
                messageBody.push({type: 'text', text: sendBody[i]});
            }
        }
    } else {
        messageBody = [
            {type: 'text', text: sendBody},
        ];
    }

    const LINE_HTTPREQUEST_REPLY: string = 'https://api.line.me/v2/bot/message/reply';
    UrlFetchApp.fetch(LINE_HTTPREQUEST_REPLY, {
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESSTOKEN,
        },
        'method': 'post',
        'payload': JSON.stringify({
            'replyToken': token,
            'messages': messageBody,
        }),
    });
}