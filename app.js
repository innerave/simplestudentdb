//Скрутили в кучу пакеты...
const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Файлик с маршрутизацией
const studentRoutes = require('./routes/students');

dotenv.config({path : './config.env'});

mongoose.connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser : true,
    useUnifiedTopology : true,
    useCreateIndex: true
});

app.use(bodyParser.urlencoded({extended:true}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(studentRoutes);

const port = process.env.PORT;
app.listen(port, ()=> {
    console.log('Сервер запущен.');
});