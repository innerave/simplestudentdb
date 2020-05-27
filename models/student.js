const mongoose = require('mongoose');

let studentScheme = new mongoose.Schema({
    name : String,
    institute : String,
    department : String,
    group : String 
});

module.exports = mongoose.model('Student', studentScheme);