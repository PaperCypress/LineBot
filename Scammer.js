const OpenAI = require("openai")
const express = require('express')
const line = require('@line/bot-sdk');
var util = require('util');
const app = express()
const port = process.env.PORT || 3000;


//app.use("/images",)

class Player {
    constructor(id, revenue, seenIntro,currentVictim) {
        this.id = id;
        this.revenue = revenue;
        this.seenIntro = seenIntro; 
        this.currentVictim=currentVictim;
        this.incall=false;
        this.profileName="";
        this.messages=[];
        this.alert=3;
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
  channelAccessToken: roomconfig.channelAccessToken
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

app.post('/roomwebhook', line.middleware(roomconfig), (req, res) => {
  for (const event of req.body.events) {
    roomEvent(event)
      }

  res.send("OK")
})

const intro = "";//change profile, name, show quick reply
const messages = [];
const partners = ["朋友","兒子","女兒","銀行","網路戀人","家人","投資"];
const CreateVictim = [
  { "role": "system", "content": `建立一位隨機人物，提供新的名字、性別、年齡、講話的個性、10~14位數字的銀行帳戶、社群用戶名稱、3~4個關於人物的資訊(例如：職業、工作公司、居住地點、家人的狀況、興趣、經常出沒場所、就醫紀錄、犯罪前科、過敏等)、、數字1~5的警戒心、valuemon是800~3000的數字，並且用這樣的json格式顯示出來
{
  "name": "名字",
  "gender": "男/女",
  "age": 年齡,
  "personality": "講話的個性",
  "bank_account": 銀行帳戶,
  "profile_name": "社群用戶名稱",
  "occupation": "職業",
  "employer": "工作公司",
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
  "chatPartner": “兒子”,
  "monvalue": 1000
}` },
]
const roleReminderVictim = `請你扮演上述這位角色，用personality的聊天口吻，你在手機上與chatPartner聊天，由我模仿本帳號並騙取你的銀行帳戶，請依我模仿的可信度、正確使用到人物資訊來回應並決定我的發言成功或失敗，成功的話在字串前加上success#，失敗的話在字串前加上fail#，沒有進展的話在字串前加上neutral#`;

const successPrompt =   { "role": "system", "content": "如果user有提到，訊息中一定要包含bank_account" };

const failPrompt =   { "role": "system", "content": "你不再信任使用者了，請回復使用者並結束對話" };

async function test(){
  const vic = await newVictim()
  const msg=[];
  const startPrompt =    { "role": "system", "content": `"${JSON.stringify(vic)}"\n${roleReminderVictim}` };  
  msg.push(startPrompt);
  console.log(startPrompt);
  console.log(msg);
  const completion = await openai.chat.completions.create({
    messages: msg,
    model: "gpt-3.5-turbo",
  });
  console.log(completion.choices[0].message.content);
}
//test();
var players={};//player information

  async function startai(player){
    player.messages=[];
    
    const startPrompt =  { "role": "system", "content": `"${JSON.stringify(player.currentVictim)}"\n${roleReminderVictim}` };
    player.messages.push(startPrompt);
    const completion = await openai.chat.completions.create({
      messages: player.messages,
      model: "gpt-3.5-turbo",
    });

    return(completion.choices[0].message.content);
  }
  async function askai(msg,player,state) {
    const reminderPrompt = { "role": "system", "content": `"${JSON.stringify(player.currentVictim)}"\n${roleReminderVictim}` };
    player.messages.push({ "role": "user", "content": msg })
  const messageswithprompt=player.messages;
  //messageswithprompt.push(reminderPrompt);
  console.log(player.messages);
  console.log(messageswithprompt);
  if(state==1){//win
    messageswithprompt.push(successPrompt);
  }
  else if(state==2){
    messageswithprompt.push(failPrompt);
  }
    const completion = await openai.chat.completions.create({
      messages: messageswithprompt,
      model: "gpt-3.5-turbo",
    });
    messages.push({ "role": "system", "content": completion.choices[0].message.content })
    console.log(completion.choices[0].message.content);
    return(completion.choices[0].message.content);
  }
  async function newVictim() {

      const completion = await openai.chat.completions.create({
        response_format: { type: "json_object" },
        messages: CreateVictim,
        model: "gpt-3.5-turbo",
      });
      
      const rawvictim=JSON.parse(completion.choices[0].message.content);
      rawvictim.chatPartner=partners[Math.floor(Math.random()*partners.length)];
      console.log(rawvictim);
      
      return(rawvictim);
  }

  async function handleEvent(event) {
    if(!players.hasOwnProperty(event.source.userId)){
      players[event.source.userId]=new Player(event.source.userId,0,false,"");
    }
    //if(!seenIntro){//change into greeting
    // 如果不是文字訊息，就跳出
    console.log(event);
    //event.source.userId
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }

    const quitcheck = /離線/;
    const helpcheck = /說明/;
    const connectcheck = /連線/;
    if(!players[event.source.userId].incall){ //Not in conversation
      if(connectcheck.test(event.message.text)){
        if(players[event.source.userId].currentVictim==""){//no target
          client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
              type: 'text',
              text: `尚未指定的對象用戶，請聯繫管理者指派新的對象`,
              sender: {
                name: "帳戶工具",          //switch profile 
                iconUrl: "https://line.me/conyprof"
              },
              quickReply:{
                items:[
                  {
                    action: {
                      type: "message",
                      label: "連線",
                      text: "連線"
                    },
                    type: "action"
                  },
                  {
                    action: {
                      type: "message",
                      label: "說明",
                      text: "說明"
                    },
                    type: "action"
                  }
                ]
              }
          }]
          })
        }
        else{//start a new conversation
          players[event.source.userId].incall=true;
          
          const reply = await startai(players[event.source.userId]);
          client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
              type: 'text',
              text: `${reply}`,
              sender: {
                name: JSON.stringify(players[event.source.userId].currentVictim.name),          //switch profile 

                iconUrl: "https://line.me/conyprof"
              },
              quickReply:{
                items:[
                  {
                    action: {
                      type: "message",
                      label: "離線",
                      text: "離線"
                    },
                    type: "action"
                  },
                  {
                    action: {
                      type: "message",
                      label: "說明",
                      text: "說明"
                    },
                    type: "action"
                  }
                ]
              }
          }]
          })
        }
      }
      else if(helpcheck.test(event.message.text)){//help
        client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
            type: 'text',
            text: `請由管理員指派預計連線，本工具將會使用代理用戶作為對象用戶及本端的接口\n當有指派的對象用戶後，輸入"連線"即可連線\n在對話中輸入"離線"則會斷線並結束對話。不論被對方斷線或主動離線，再次連線到同個對象則會分配一個新的代理用戶做為窗口給你使用`,//regex test sole usage of the word
            //show profile flex box
            quickReply:{
              items:[
                {
                  action: {
                    type: "message",
                    label: "連線",
                    text: "連線"
                  },
                  type: "action"
                },
                {
                  action: {
                    type: "message",
                    label: "說明",
                    text: "說明"
                  },
                  type: "action"
                }
              ]
            }
        }]
        })
      }



    }    
    else{ //In conversation
      if(quitcheck.test(event.message.text)){//quit
        players[event.source.userId].incall=false;
        //change profile and name back
        //clear messages
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
                    label: "連線",
                    text: "連線"
                  },
                  type: "action"
                },
                {
                  action: {
                    type: "message",
                    label: "說明",
                    text: "說明"
                  },
                  type: "action"
                }
              ]
            }
        }],
        })
      }
      else{//normal talk
        var gamestate=0;
        if(players[event.source.userId].alert<=0){
            gamestate=1;
        }
        else if(players[event.source.userId].alert>=8){//fail
          gamestate=2;
        }
        const response = await askai(event.message.text,players[event.source.userId],gamestate);
        const reply = response.split('#')[1];
        const state = response.split('#')[0];
        switch(state){
          case "success":
            players[event.source.userId].alert-=1;
          break;
          case "fail":
            players[event.source.userId].alert+=1;
          break;
          case "neutral":
          break;
        }
        console.log("Alert:"+players[event.source.userId].alert)
        
        if(gamestate==2){//failed
          client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
              type: 'text',
              text: `${reply}`,
              sender: {
                name: JSON.stringify(players[event.source.userId].currentVictim.name),
                iconUrl: "https://line.me/conyprof"
              },
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
          },
          {
            type: 'text',
            text: `代理用戶已遭封鎖`,
            quickReply:{
              items:[
                {
                  action: {
                    type: "message",
                    label: "連線",
                    text: "連線"
                  },
                  type: "action"
                },
                {
                  action: {
                    type: "message",
                    label: "說明",
                    text: "說明"
                  },
                  type: "action"
                }
              ]
            }
          }        ]
          })
          return;
        }

        client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
            type: 'text',
            text: `${reply}`,
            sender: {
              name: JSON.stringify(players[event.source.userId].currentVictim.name),
              iconUrl: "https://line.me/conyprof"
            },
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
        }        ]
        })

        
    
        
      }
    } 
      
  }
  
  async function roomEvent(event){
    if (event.type !== 'message' || event.message.type !== 'text'|| event.source.type !== 'group') {//filter out non group chats
      return;
    }
    if(event.source.groupId !== process.env.GROUPID){
      return;
    }
    if(!players.hasOwnProperty(event.source.userId)){
      players[event.source.userId]=new Player(event.source.userId,0,false,"");
      console.log(event.source.userId);
    }
    console.log(event);
    var profilename;

    scamRoom.getGroupMemberProfile(event.source.groupId,event.source.userId)
    .then((profile) => {
      console.log(profile.displayName); //顯示使用者名字
      profilename=profile.displayName;
      console.log(profile.userId);
      console.log(profile.statusMessage) // 使用者自介內容
    })
    .catch((err) => {
      console.log("Could not get profile"+err);
    });
    
    const newvictimcheck = /新的/;
    const moneycheck = /利潤/;
    if(newvictimcheck.test(event.message.text)){
      var victim=await newVictim();
      players[event.source.userId].alert=Number(victim.alert_level);
      console.log(JSON.stringify(victim.family));
      players[event.source.userId].currentVictim=victim;
      //break if incall
      scamRoom.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: `@${profilename} 你的下一個對象是${JSON.stringify(victim.name)}\n一位${JSON.stringify(victim.age)}歲${JSON.stringify(victim.gender)}性`,  
          
      },
      {
        type: 'text',
        text: `建議這一位可以透過模仿${JSON.stringify(victim.chatPartner)}來操作`,
        
    }
    
    ],
      })
    }
    else if(moneycheck.test(event.message.text)){
      var responsetext=`你目前分到的利潤有${players[event.source.userId].revenue}元喔`;
        if(players[event.source.userId].revenue<=0){
          responsetext=`你還沒有提供給我們過任何東西，加油!`;
        }
        
        
        scamRoom.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: responsetext,
          
      }],
      })
    }

    else if(players[event.source.userId].currentVictim!==""){
      const accountCheck=new RegExp(`${JSON.stringify(players[event.source.userId].currentVictim.bank_account)}`);
      if(accountCheck.test(event.message.text)){

        players[event.source.userId].revenue+=Number(players[event.source.userId].currentVictim.valuemon);
        players[event.source.userId].currentVictim="";  
        
        scamRoom.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: 'text',
            text: `恩，這組戶頭經過確認是可用的，不錯!`,
            
        }],
        })
      }
    }

  }



  app.listen(port, () => {
    console.log(`Sample LINE bot server listening on port ${port}...`)
  })
