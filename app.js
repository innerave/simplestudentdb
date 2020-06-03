//Скрутили в кучу пакеты...
const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv");
const methodOverride = require("method-override");
const session = require("express-session");
const flash = require("connect-flash");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

// Файлик с маршрутизацией
const studentRoutes = require("./routes/students");

const User = require("./models/usermodel");

dotenv.config({ path: "./config.env" });

mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then((con) => {
    console.log("База данных подключена.");
  });

app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(methodOverride("_method"));

app.use(
  session({
    secret: "nodejs",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate())
);
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(flash());

//Переменные для сообщений
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  //failureFlash в passport требует специальной переменной
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});

app.use(studentRoutes);

const port = process.env.PORT;
app.listen(port, () => {
  console.log("Сервер запущен.");
});
