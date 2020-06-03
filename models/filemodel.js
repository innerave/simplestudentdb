const mongoose = require('mongoose');

let fileScheme = new mongoose.Schema({
    name : String,
    size : Number,
    data : Buffer,
    mimetype : String
});

module.exports = mongoose.model('File', fileScheme);