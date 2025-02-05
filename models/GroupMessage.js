// importing mongoose module
const mongoose = require('mongoose')

// creating schema for user
const groupMessageSchema = new mongoose.Schema({
    from : String,
    room: String,
    message : String,
    date_sent: { type: Date, default: Date.now },
})


// exporting user model
module.exports = mongoose.model('GroupMessage', groupMessageSchema)