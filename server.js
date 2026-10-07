require('dotenv').config()
const app = require('./src/app')
//const dbModule = require('./src/db/db.js')
const { connectPG } = require('./src/db/db.JS')

connectPG()

app.listen(process.env.SERVER_PORT, () => {
    console.log(`server is listening on port no ${process.env.SERVER_PORT}`)
})