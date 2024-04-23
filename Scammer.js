const OpenAI = require("openai")
const express = require('express')
const line = require('@line/bot-sdk');
const app = express()
const port = 3000

//app.use("/images",)

class Player {
    constructor(id, revenue, stage) {
        this.id = id;
        this.revenue = revenue;
        this.stage = stage; 
    }
  
    // Method to check if the food item has expired
    hasExpired() {
        const today = new Date();
        return this.expiryDate < today;
    }
  
    // Method to display information about the food item
    getInfo() {
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

// Load .env to environment variable
require('dotenv').config()
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}

const openai = new OpenAI({
  organization: process.env.OPENAI_ORGANIZATION,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
})
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
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
const messages = [
  { "role": "system", "content": "建立一位人物，提供性別、職位、年齡、興趣、難度(警戒心)" },
]
var players;//player information
async function askai(msg) {

  messages.push({ "role": "user", "content": msg })//add to message 
    const completion = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-3.5-turbo",
    });
    messages.push({ "role": "system", "content": completion.choices[0].message.content })
    console.log(completion.choices[0].message.content);
    return(completion.choices[0].message.content);
  }

  async function handleEvent(event) {
    // 如果不是文字訊息，就跳出
    console.log(event);
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }
    //check if image or text
    //create image
    const photocheck = /照片/;
    var needimage=false;
    if(photocheck.test(event.message.text)){
      needimage=true;
    }
    
    if(needimage){
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: messages[messages.length-1].content,
        n: 1,
        size: "1024x1024",
      });
    
    imageUrl = response.data[0].url;



    client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: `你的水族箱的照片：`
      },
      {
        type:'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      }
    ],
    })
    }
    else{
      const reply = await askai(event.message.text);
      client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
          type: 'text',
          text: `${reply}`
        }
      ],
      })
    }
  }
  
  app.listen(port, () => {
    console.log(`Sample LINE bot server listening on port ${port}...`)
  })