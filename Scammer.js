const OpenAI = require("openai")
const express = require('express')
const line = require('@line/bot-sdk');
const app = express()
const port = 3000


//app.use("/images",)

class Player {
    constructor(id, revenue, seenIntro,currentVictim) {
        this.id = id;
        this.revenue = revenue;
        this.seenIntro = seenIntro; 
        this.currentVictim=currentVictim;
    }
}

// Load .env to environment variable
require('dotenv').config()
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}
const roomconfig = {
  channelAccessToken: process.env.CHANNEL_ROOM_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_ROOM_SECRET
}

const openai = new OpenAI({
  organization: process.env.OPENAI_ORGANIZATION,
})
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
})
const scamRoom = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelroomAccessToken
})

app.get('/', (req, res) => {
  res.send(`Hi ${req.query.name}!`)
})

app.post('/webhook', line.middleware(config), (req, res) => {
  for (const event of req.body.events) {
    handleEvent(event)
      }

  res.send("OK")
})

app.post('/webhook', line.middleware(roomconfig), (req, res) => {
  for (const event of req.body.events) {
    handleRoomEvent(event)
      }

  res.send("OK")
})

const intro = "";//change profile, name, show quick reply
const messages = [];
const CreateVictim = [
  { "role": "system", "content": `隨機建立一位人物，提供名字、性別、年齡、10~14位數字的銀行帳戶、3~4個關於人物的資訊(例如：職業、工作公司、居住地點、家人的狀況、興趣、經常出沒場所、就醫紀錄、犯罪前科、過敏等)、數字1~5的警戒心、，並且用這樣的json格式顯示出來
{
  "name": "李美玲",
  "gender": "女",
  "age": 62,
  "bank_account": 1234567890,
  "occupation": "早餐店員工",
  "employer": "美麗早餐",
  "residence": "台北市信義區",
  "family": {
  "marital_status": "已婚",
  "spouse": "李明偉",
  "children": 1
  },
  "interests": ["閱讀", "登山", "攝影"],
  "medical_records": {
  "allergies": ["花粉"],
  "past_illnesses": ["過敏性鼻炎", "輕微慢性支氣管炎"]
  },
  "criminal_record": false,
  "alert_level": 3,
“chatPartner”: “兒子”
}` },
]
const roleReminderVictim = [
  { "role": "system", "content": `${rawVictimInformation} 請你扮演上述這位角色，當作你剛在手機上連線上一個認識的人或機構的帳號，由我模仿本帳號並騙取你的銀行帳戶，請依我模仿的可信度、正確使用到人物資訊來回應並決定我的發言成功或失敗，成功的話在字串前加上success#，失敗的話在字串前加上fail#，沒有進展的話在字串前加上neutral#` },
]
const successPrompt = [
  { "role": "system", "content": "訊息中一定要包含bank_account" },
]
const failPrompt = [
  { "role": "system", "content": "你不再信任使用者了，請回復使用者並結束對話" },
]
var rawVictimInformation;//this should not be leaked directly
var incall = false;
var alertness = 0;
var players={};//player information

  async function startai(){
    messages= [];
    messages.push()
  }
  async function askai(msg) {

  messages.push({ "role": "user", "content": msg })
  const messageswithprompt=messages;
  messageswithprompt.push(roleReminderVictim);
    const completion = await openai.chat.completions.create({
      messages: messageswithprompt,
      model: "gpt-3.5-turbo",
    });
    messages.push({ "role": "system", "content": completion.choices[0].message.content })
    console.log(completion.choices[0].message.content);
    return(completion.choices[0].message.content);
  }
  async function newVictim(msg) {

    messages.push({ "role": "user", "content": msg })
      const completion = await openai.chat.completions.create({
        response_format: { type: "json_object" },
        messages: CreateVictim,
        model: "gpt-3.5-turbo",
      });
      messages.push({ "role": "system", "content": completion.choices[0].message.content })
      console.log(completion.choices[0].message.content);
      rawVictimInformation=completion.choices[0].message.content;
      alertness=completion.choices[0].message.content.alertness;
      return(completion.choices[0].message.content);
  }

  async function handleEvent(event) {
    //if(!seenIntro){//change into greeting
      //show intro
      //return;
    //}
    // 如果不是文字訊息，就跳出
    console.log(event);
    //event.source.userId
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }

    const quitcheck = /離線/;
    const moneycheck = /查詢利潤/;

    const connectcheck = /連線/;
    if(!incall){ //Not in conversation
      if(moneycheck.test(event.message.text)){

      }

      else if(connectcheck.test((event.message.text)){
        if(rawVictimInformation==""){
        }
        else{
          incall=true;
          //switch profile 
          const reply = await askai();
          
        }
      }



    }    
    else{ //In conversation
      if(quitcheck.test(event.message.text)){//quit
        //quit
        incall=false;
        //change profile and name back
        //clear messages
        //clear rawvictiminfo
        rawVictimInformation="";
        client.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: 'text',
            text: `您離開了對話`,
            quickReply:
            {
              items:[
                {
                  action: {
                    type: "message",
                    label: "尋找新用戶",
                    text: "尋找新用戶"
                  },
                  type: "action"
                },
                {
                  action: {
                    type: "message",
                    label: "查詢利潤",
                    text: "查詢利潤"
                  },
                  type: "action"
                },
              ]
            }
        }],
        })
      }
      else{
        const reply = await askai(event.message.text);
        //check state of game
        client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
            type: 'text',
            text: `${reply}`,
            quickReply:{
              items:[
                {
                  action: {
                    type: "message",
                    label: "離線",
                    text: "離線"
                  },
                  type: "action"
                }
              ]
            }
        }]
        })
    
        
      }
    } 
      
  }
  const newvictimcheck = /新用戶/;
  async function roomEvent(event){
    //filter out non group chats
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }
    if(newvictimcheck){
      var victim=await newVictim();
      rawVictimInformation=victim;
      client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: `${victim.name}，${victim.age}歲${victim.gender}性
          你目前操作的用戶是對方的${victim.chatpartner}`,
          
      }],
      })
    }
  }

  app.listen(port, () => {
    console.log(`Sample LINE bot server listening on port ${port}...`)
  })
