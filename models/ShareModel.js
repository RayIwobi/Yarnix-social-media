const mongoose = require('mongoose')


const ShareSchema = new mongoose.Schema({
    description:{
        type:String,
        required:false
    },
    image:{
        type:String,
        required:true
    }

},{timestamps:true})

const ShareModel = mongoose.model('share', ShareSchema)
module.exports = ShareModel