const express = require('express')
const redis = require('redis')

// Load .env to environment variable
require('dotenv').config()

const app = express()
const port = 3000

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
})

redisClient.on('error', err => {
  console.log(`Redis client error: ${err}`)
})

async function redisConnect() {
  await redisClient.connect()
  await redisClient.set("user", "yychen")
  const value = await redisClient.get("user")

  console.log(`Redis value user: ${value}`)
}

app.get('/', (req, res) => {
  res.send(`Hi ${req.query.name}!`)
})

app.get('/redis', async (req, res) => {
  const value = await redisClient.get(req.query.key)

  await redisClient.hSet('user-session:123', {
    name: 'Tom',
    surname: 'Chen',
    company: 'Fugu Fish Creations',
    year: 2024
  })

  const profile = await redisClient.hGetAll('user-session:123')
  res.send(`value: ${value}, profile: ${JSON.stringify(profile)}`)
  console.log(profile)
})

app.use('/static', express.static('static'));
app.use('/media', express.static('media'));

app.listen(port, () => {
  console.log(`Sample LINE bot server listening on port ${port}...`)
})

redisConnect()