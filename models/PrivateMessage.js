// importing mongoose module
const mongoose = require('mongoose')

// creating schema for user
const privateMessageSchema = new mongoose.Schema({
    from_user : String,
    to_user: String,
    message : String,
    date_sent: { type: Date, default: Date.now },
})

// exporting user model
module.exports = mongoose.model('PrivateMessage', privateMessageSchema)