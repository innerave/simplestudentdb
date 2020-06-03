const mongoose = require('mongoose');

let fileScheme = new mongoose.Schema({
    file : String,
});

let studentScheme = new mongoose.Schema({
    name : String,
    institute : String,
    department : String,
    group : String,
    portfolio : fileScheme
});

module.exports = mongoose.model('Student', studentScheme);