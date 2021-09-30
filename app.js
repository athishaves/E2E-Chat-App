const express = require('express')

const app = express()
const port = process.env.PORT || 8000


const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }));




// EJS

const path = require('path')

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs');


// Session

const session = require('express-session');

app.use(session({
    secret: 'secret-code',
    saveUninitialized: false,
    resave: false
}))



// Connect routes

app.use('/', require('./routes'));



// Socket


const http = require('http').createServer(app)
const io = require('socket.io')(http)

io.on("connection", client => {

    client.on('send-message', ({messageObj, receiver}) => {
        client.broadcast.emit(receiver, {messageObj})
    })

    client.on('typing', ({status, receiver}) => {
        client.broadcast.emit(receiver, status)
    })
})



http.listen(port, () => {
    console.log(`Http listening on port ${port}`)
})
