const express = require('express')
const socketio = require('socket.io')
const mongoose = require('mongoose')
let authRoutes = require('./routes/authRoutes')
const app = express()
const PrivateMessage = require('./models/PrivateMessage')
const GroupMessage = require('./models/GroupMessage')

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
let groupTypingUsers = {};

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
        const { group_name, username } = data;

        if (!groupTypingUsers[group_name]) {
            groupTypingUsers[group_name] = new Set();
        }

        groupTypingUsers[group_name].add(username);

        io.to(group_name).emit('group_typing', { group_name, users: [...groupTypingUsers[group_name]] });
    });

    socket.on('group_not_typing', (data) => {
        const { group_name, username } = data;

        if (groupTypingUsers[group_name]) {
            groupTypingUsers[group_name].delete(username);

            if (groupTypingUsers[group_name].size === 0) {
                delete groupTypingUsers[group_name];
            }
        }

        io.to(group_name).emit('group_typing', { group_name, users: [...(groupTypingUsers[group_name] || [])] });
    });    
    
    socket.on('group_message', async (data) => {
        const { username, group_name, message } = data;
        const newMessage = new GroupMessage({ from: username, room: group_name, message });

        await newMessage.save();

        io.to(group_name).emit('group_message', {
            from: username,
            message,
            date_sent: newMessage.date_sent
        });
    });
    
    socket.on('join_group',async (groupName) =>{
        socket.join(groupName);
        const messages = await GroupMessage.find({ room: groupName }).sort({ date_sent: 1 });
        socket.emit('group_chat_history', messages);
    })

    socket.on('leave_group', (groupName) => {
        socket.leave(groupName);
        socket.emit('clear_chat_history'); // Notify client to clear the chat history
    });    
    
    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);

        for (let group in groupTypingUsers) {
            groupTypingUsers[group] = new Set([...groupTypingUsers[group]].filter(u => onlineUsers[u] !== socket.id));
            if (groupTypingUsers[group].size === 0) {
                delete groupTypingUsers[group];
            }
        }

        Object.keys(onlineUsers).forEach(username => {
            if (onlineUsers[username] === socket.id) delete onlineUsers[username];
        });
    });

    console.log(onlineUsers)

})