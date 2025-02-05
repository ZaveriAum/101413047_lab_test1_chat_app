const express = require('express')
const socketio = require('socket.io')
const mongoose = require('mongoose')
let authRoutes = require('./routes/authRoutes')
const app = express()
const PrivateMessage = require('./models/PrivateMessage')

const server = app.listen(3000, () => {
    console.log(`Socket server running at http://localhost:3000/`)
})

mongoose.connect("mongodb://localhost:27017/chat_app_db")
    .then(() => {
        console.log("Connection open!!")
    }).catch((err) => {
        console.log("Error: " + err)
    })

const io = socketio(server)

let onlineUsers = {};

// const admin = io.of('/')
app.use('/v1/auth', authRoutes)

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/views/home.html');
})

app.get('/private-chat', (req, res) => {
    res.sendFile(__dirname + '/views/chat.html')
})

app.get('/group-chat', (req, res) => {
    res.sendFile(__dirname + '/views/group_chat.html')
})


io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('register_user', (username) => {
        onlineUsers[username] = socket.id;
        console.log(`User Registered: ${username} -> ${socket.id}`);
    });

    socket.on('typing', (data) => {
        const recipientSocket = onlineUsers[data.to];
        if (recipientSocket) {
            io.to(recipientSocket).emit('typing', { from_user: data.from_user });
        }
    });

    socket.on('not_typing', (data) => {
        const recipientSocket = onlineUsers[data.to];
        if (recipientSocket) {
            io.to(recipientSocket).emit('not_typing', { from_user: data.from_user });
        }
    });

    socket.on('private_message', async (data) => {
        const { from_user, to_user, message } = data;
    
        const newMessage = new PrivateMessage({ from_user, to_user, message });
        await newMessage.save();
    
        const recipientSocket = onlineUsers[to_user];
        const senderSocket = onlineUsers[from_user];
    
        if (recipientSocket) {
            io.to(recipientSocket).emit('private_message', { from_user, message, date_sent: newMessage.date_sent });
        }
    
        if (senderSocket) {
            io.to(senderSocket).emit('private_message', { from_user, message, date_sent: newMessage.date_sent });
        }
    });
    

    socket.on('get_chat_history', async ({ from_user, to_user }) => {
        const messages = await PrivateMessage.find({
            $or: [
                { from_user, to_user },
                { from_user: to_user, to_user: from_user }
            ]
        }).sort({ date_sent: 1 });

        socket.emit('chat_history', messages);
    });

    socket.on('group_typing', (data) => {
        io.to(data.group_name).emit('group_typing', data)
    })
    
    socket.on('group_not_typing', (data) => {
        io.to(data.group_name).emit('group_not_typing', data)
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
    
    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);
        Object.keys(onlineUsers).forEach(username => {
            if (onlineUsers[username] === socket.id) delete onlineUsers[username];
        });
    });

    console.log(onlineUsers)

})