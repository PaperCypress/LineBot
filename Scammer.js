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
        this.currentIcon="";
        this.incall=false;
        this.profileName="";
        this.messages=[];
        this.alert=3;
        this.provided=false;
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

const partners = ["朋友","兒子","女兒","銀行","網路戀人","家人","投資"];
const randomTags = ["投資","愛情","結婚","旅遊","綁架","銀行","網路戀愛","環保","轉帳失誤","恐嚇","家人"];
const personalities = ["老人","文言文","中英夾雜","講話粗俗","愛撒嬌","愛裝可愛","御宅族","詩人","悲觀"];
const randomManIcons = ["1","2","3","4","5","11","23","24","26"]; 
const randomWomanIcons = ["1","2","3","5","7","8","9","10","23","24","25","26","27","28"]; 

const CreateVictim = [
  { "role": "system", "content": `建立一位隨機人物，提供新的名字、性別、年齡、講話的個性、10~14位數字的銀行帳戶、社群用戶名稱、3~4個關於人物的資訊facts(例如：職業、工作公司、居住地點、家人的狀況、興趣、經常出沒場所、就醫紀錄、犯罪前科、過敏等)、、數字1~5的警戒心、感興趣的主題tags、valuemon是800~3000的數字，並且用這樣的json格式顯示出來
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
  "facts": ["喜歡閱讀", "已婚", "支氣管炎","有兩個女兒"],
  "tags":["愛情", "結婚","投資"]
  "alert_level": 3,
  "monvalue": 1000
}` },
]
const roleReminderVictim = `你是上述這位角色，聊天口吻按照personality，請回應並依我的回覆是否與tags有關聯、使用到角色資訊facts或我扮演的人物與partner相符，來決定我的發言成功或失敗，第一句不可以包含tags，成功的話在字串前加上success#，失敗的話在字串前加上fail#，沒有進展的話在字串前加上neutral#`;
const begin =  { "role": "system", "content": "你剛用手機聊天app跟我連絡上，但你不認識帳戶名稱"};

const successPrompt =   { "role": "system", "content": "如果user有曾提到銀行帳戶或號碼，你的回覆中一定要包含bank_account" };

const failPrompt =   { "role": "system", "content": "你不再信任使用者了，請回覆並結束對話" };

async function test(){
  const vic = await newVictim()
  const msg=[];
  const startPrompt =    { "role": "system", "content": `"${JSON.stringify(vic)}"\n${roleReminderVictim}` };  
  msg.push(startPrompt);
  console.log(msg);
  const completion = await openai.chat.completions.create({
    messages: msg,
    model: "gpt-3.5-turbo",
  });
  console.log(completion.choices[0].message.content);
}
//test();
LoadData();
var players={};//player information

  async function startai(player){
    player.messages=[];
    
    const startPrompt =  { "role": "system", "content": `"${JSON.stringify(player.currentVictim)}"\n${roleReminderVictim}` };
    player.messages.push(startPrompt);
    player.messages.push(begin);
    const completion = await openai.chat.completions.create({
      messages: player.messages,
      model: "gpt-3.5-turbo",
    });
    console.log(completion.choices[0].message.content);
    return(completion.choices[0].message.content);
  }
  async function askai(msg,player,state) {
    const reminderPrompt = { "role": "system", "content": `"${JSON.stringify(player.currentVictim)}"\n${roleReminderVictim}` };
    player.messages.push({ "role": "user", "content": msg })
  const messageswithprompt= player.messages.map((x) => x);;
  messageswithprompt.push(reminderPrompt);

  if(state==1){//win
    console.log("pushedsuccess");
    messageswithprompt.push(successPrompt);
  }
  else if(state==2){
    messageswithprompt.push(failPrompt);
  }
  console.log(messageswithprompt);
    const completion = await openai.chat.completions.create({
      messages: messageswithprompt,
      model: "gpt-3.5-turbo",
    });
    player.messages.push({ "role": "system", "content": completion.choices[0].message.content })
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
      rawvictim.partner=partners[Math.floor(Math.random()*partners.length)];
      rawvictim.personality=personalities[Math.floor(Math.random()*personalities.length)];
      const index1 = Math.floor(Math.random() * randomTags.length);
      let index2 = Math.floor(Math.random() * randomTags.length);
  
  // Ensure index2 is different from index1
      while (index2 === index1) {
        index2 = Math.floor(Math.random() * randomTags.length);
      }
      rawvictim.tags=[2];
      rawvictim.tags[0]=randomTags[index1];
      rawvictim.tags[1]=randomTags[index2];
      rawvictim.bank_account=Math.floor(1000000000 + Math.random() * 9000000000);
      console.log(rawvictim);
      
      return(rawvictim);
  }
  function SetRevenue(userid,revenue){
    if(players.hasOwnProperty(userid)){
      players[userid].revenue=Number(revenue);
    }
    var totalrevenue=0;
    Object.entries(players).forEach(([key, value]) => {
      console.log(key,value.profileName ,value.revenue);
      totalrevenue+=value.revenue;
   });
    console.log("總金額"+totalrevenue);

  }
  function SaveData(){
    var json = JSON.stringify(players);
    var fs = require('fs');
    fs.writeFile('save.json', json, 'utf8', function(callback){
      console.log('Saved'); 
    });
  }
  function LoadData(){
    var fs = require('fs');
    fs.readFile('save.json', 'utf8', function readFileCallback(err, data){
      if (err){
          console.log(err);
      } else {
      players = JSON.parse(data); //now it an object
      console.log('Loaded'); 
  }});
  }
  process.stdin.on('data', function(data) {
    // Convert the input data to a string and remove whitespace
    var input = data.toString().trim();
    
    if(input==="save"){
      SaveData();
    } 
    else if(input==="load"){
      LoadData();
    }
    else{
      SetRevenue(input.split('.')[0],input.split('.')[1]);
    }
    
});
  async function handleEvent(event) {
    if(!players.hasOwnProperty(event.source.userId)){
      players[event.source.userId]=new Player(event.source.userId,0,false,"");
    }
    //if(!seenIntro){//change into greeting
    // 如果不是文字訊息，就跳出
    console.log(event);
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }

    const quitcheck = /離線|disconnect/;
    const helpcheck = /幫助|help|說明|h/;
    const connectcheck = /連線|connect/;
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
          
          const response = await startai(players[event.source.userId]);
          var reply = response.split('#')[1];
          if(!response.includes('#')){
            reply = response.split('#')[0];
          }

          client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
              type: 'text',
              text: `${reply}`,
              sender: {
                name: victimInfo(players[event.source.userId].currentVictim.profile_name),          //switch profile 
                iconUrl: players[event.source.userId].currentIcon
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
        var targettext=`尚未指定的對象用戶，請聯繫管理者指派新的對象`;
        if(players[event.source.userId].currentVictim!=""){
          targettext=`目前指派對象用戶為${victimInfo(players[event.source.userId].currentVictim.profile_name)}`;
        }
        client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: 'text',
              text: `請由管理員指派預計連線用戶，本工具將隨機代理用戶成為對象用戶及本端的中介，\n當有指派的對象用戶後，輸入"連線"即可連線\n在對話中輸入"離線"則會斷線並結束對話。不論被對方斷線或主動離線，再次連線到同個對象則會分配一個新的代理用戶做為窗口給你使用`,//regex test sole usage of the word
              //show profile flex box
          },
            {
            type: 'text',
            text: targettext,
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
      else if(quitcheck.test(event.message.text)){
        client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
            type: 'text',
            text: `目前沒有連上任何用戶`,
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
      else{//not connect or 
        
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
        if(players[event.source.userId].alert<=1){
            gamestate=1;
            console.log("success");
        }
        else if(players[event.source.userId].alert>=8){//fail
          gamestate=2;
        }
        const response = await askai(event.message.text,players[event.source.userId],gamestate);
        
        const reply = response.split('#')[1];
        const state = response.split('#')[0];
        if(response.includes('#')){
          switch(state){
            case "success":
              players[event.source.userId].alert-=Math.floor(Math.random()+ 1);
              
            break;
            case "fail":
              players[event.source.userId].alert+=1;
            break;
            case "neutral":
            break;
          }
        }
        else{
          reply=state;
        }
        console.log("Alert:"+players[event.source.userId].alert)
        
        if(gamestate==2){//failed
          players[event.source.userId].incall=false;
          players[event.source.userId].alert=Number(victim.alert_level);
          client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
              type: 'text',
              text: `${reply}`,
              sender: {
                name: victimInfo(players[event.source.userId].currentVictim.profile_name),
                iconUrl: players[event.source.userId].currentIcon
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
              name: victimInfo(players[event.source.userId].currentVictim.profile_name),
              iconUrl: players[event.source.userId].currentIcon
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
    if (event.source.type !== 'group') {//filter out non group chats
      return;
    }
    if (event.type == 'memberJoined') {
      scamRoom.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: `歡迎! 新進來的請先看筆記喔`,
          
      }],
      })
      return;
    }
    else if(event.type !== 'message' || event.message.type !== 'text'){
      return;
    }
    //if(event.source.groupId !== process.env.GROUPID){
      //return;
    //}
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
      players[event.source.userId].profileName=profile.displayName;
      console.log(profile.userId);
      console.log(profile.statusMessage) // 使用者自介內容
    })
    .catch((err) => {
      console.log("Could not get profile"+err);
    });
    
    const newvictimcheck = /新的|指派/;
    const moneycheck = /我.*(賺|有).*(錢|收入|利潤)/;
    if(newvictimcheck.test(event.message.text)){//提供新的人
      var victim=await newVictim();
      
      players[event.source.userId].currentIcon=randomWomanIcons[Math.floor(Math.random()*randomWomanIcons.length)];
      if(victim.gender=="男"){
        players[event.source.userId].currentIcon=randomManIcons[Math.floor(Math.random()*randomManIcons.length)];
      }
      const iconurl=`https://papercypress.github.io/LineBot/static/${players[event.source.userId].currentIcon}.jpg`
      players[event.source.userId].currentIcon=iconurl;
      
      players[event.source.userId].provided=false;
      players[event.source.userId].alert=Number(victim.alert_level);
      players[event.source.userId].currentVictim=victim;
      

      //roll for facts and approaches
      const factroll=Math.floor(Math.random()*3+1);
      var factstring=
      //break if incall
      scamRoom.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: `@${profilename} 你的下一個對象是${victimInfo(victim.name)}\n一位${JSON.stringify(victim.age)}歲${victimInfo(victim.gender)}性\n`,  
          
      },
      {
        type: 'text',
        text: `建議可以透過${victimInfo(victim.tags[0])}或${victimInfo(victim.tags[1])}的面相來操作`,
        
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
        if(players[event.source.userId].provided){
          scamRoom.replyMessage({
            replyToken: event.replyToken,
            messages: [{
              type: 'text',
              text: `這組已經在我們的資料內了，去找另一位的吧`,
              
          }],
          }) 
        }
        else{
        players[event.source.userId].revenue+=players[event.source.userId].currentVictim.monvalue;
        players[event.source.userId].provided=true;  
        SaveData();
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

  }
  function victimInfo(victimProperty){
    return JSON.stringify(victimProperty).replace(/^"|"$/g, '');
  }


  app.listen(port, () => {
    console.log(`Sample LINE bot server listening on port ${port}...`)
  })
