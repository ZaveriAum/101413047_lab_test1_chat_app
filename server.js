const express = require('express')
const socketio = require('socket.io')

const app = express()

const server = app.listen(3000, () => {
    console.log(`Socket server running at http://localhost:3000/`)
})

const socketIds = [];

const io = socketio(server)
// const admin = io.of('/')

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/chat.html')
})

app.get('/group-chat', (req, res) => {
    res.sendFile(__dirname + '/views/group_chat.html')
})

io.on('connection', (socket) => {
    console.log(`New Socket connection: ${socket.id}`)
    socketIds.push(socket.id)
    socket.on('disconnect', (reason) => {
        socketIds.pop(socket.id)
        console.log(`Client disconnected ${socket.id} : ${reason}`)
    })

    socket.on('typing', (data) => {
        io.to(data.to).emit('typing', data)
    })

    socket.on('not_typing', (data) => {
        console.log("Here")
        io.to(data.to).emit('typing', data)
    })

    socket.on('message', (data) => {
        socket.send('Hello from Server')
    })

    socket.on('chat_message', (data) => {
        io.to(data.to).emit('chat_message', data)
    })

    socket.on('group_message', (data) =>{
        io.to(data.group_name).emit('group_message', data)
    })

    socket.on('join_group', (groupName) =>{
        socket.join(groupName)
    })

     socket.on('leave_group', (groupName) =>{
        socket.leave(groupName)
    })
    console.log(socketIds)

})