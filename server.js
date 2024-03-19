// Based on https://line.github.io/line-bot-sdk-nodejs/getting-started/basic-usage.html#synopsis
// 做了一些修改讓同學們比較好理解

const express = require('express')
const line = require('@line/bot-sdk');
const app = express()
const port = 3000

class Food {
  constructor(name, amount, expiryDate) {
      this.name = name;
      this.amount = amount;
      this.expiryDate = new Date(expiryDate); // Parsing expiry date as a Date object
  }

  // Method to check if the food item has expired
  hasExpired() {
      const today = new Date();
      return this.expiryDate < today;
  }

  // Method to display information about the food item
  displayInfo() {
    var ed="";
    var am="";
    if(this.expiryDate){//truthy
      ed=`，${this.expiryDate.toDateString()}過期`;
    }
    if(this.amount){
      am=this.amount;
    }
      
      return `${am}${this.name}${ed}`;
  }
}
var items = [
  new Food("飲料", "一杯", "2024-03-15"),
  new Food("麵包", "一袋", "2024-03-10"),
  new Food("牛奶", "一瓶", "2024-03-20"),
  new Food("繽紛樂", "1.5個", "2024-03-26"),
];

require('dotenv').config()

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
})

app.get('/', (req, res) => {
  res.send(`Hi ${req.query.name}!`)
})

app.post('/webhook', line.middleware(config), (req, res) => {
  // req.body.events 可能有很多個
  for (const event of req.body.events) {
    handleEvent(event)
  }

  // 回傳一個 OK 給呼叫的 server，這邊應該是回什麼都可以
  res.send("OK")
})

const summonword = /冰箱/;
const summonword2 = /櫃/;
const ask = /有(?=.*(?:什麼|啥|甚麼))/;
const add = /有/;//
const remove = /沒有/;//
//const change = 

function handleEvent(event) {
  // 如果不是文字訊息，就跳出
  console.log(event);
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  if (!summonword.test(event.message.text)) {
    return;
  }

  var reply="";
  if(ask.test(event.message.text)){
    for(let i=0;i<items.length;i++){
      reply+=items[i].displayInfo()+"\n";
    }
  }
  else if(remove.test(event.message.text)){
    
  }
  else if(add.test(event.message.text)){

  }
  if(reply==""){
    reply="!";
  }
  // 回覆一模一樣的訊息，多一個驚嘆號
  client.replyMessage({
    replyToken: event.replyToken,
    messages: [{
      type: 'text',
      text: `${reply}`
    }],
  })
}

app.listen(port, () => {
  console.log(`Sample LINE bot server listening on port ${port}...`)
})

