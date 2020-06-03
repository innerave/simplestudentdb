const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const async = require('async');
const nodemailer = require('nodemailer');
const User = require('../models/usermodel');
const Student = require('../models/student');
const File= require('../models/filemodel');
// Проверка на аутентификацию
function isAuthenticatedUser(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Для доступа к этой странцие необходимо авторизироваться.')
    res.redirect('/login');
}

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/signup', (req, res) => {
    res.render('signup');
});

router.get('/logout', isAuthenticatedUser, (req, res) => {
    req.logOut();
    req.flash('success_msg', 'Вы вышли из учетной записи');
    res.redirect('/login');
});

router.get('/forgot', (req, res) => {
    res.render('forgot');
});

router.get('/reset/:token', (req, res) => {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
        .then(user => {
            if (!user) {
                req.flash('error_msg', 'Ссылка восстановления пароля недействительна.');
                res.redirect('/forgot');
            }

            res.render('newpassword', { token: req.params.token });
        })
        .catch(err => {
            req.flash('error_msg', 'Ошибка: ' + err);
            res.redirect('/forgot');
        });
});

router.get('/password/change', isAuthenticatedUser, (req, res) => {
    res.render('changepassword');
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: 'Неверное имя пользователя или пароль'
}));


router.post('/signup', (req, res) => {
    let { name, email, password } = req.body;

    let userData = {
        name: name,
        email: email
    };

    User.register(userData, password, (err, user) => {
        if (err) {
            req.flash('error_msg', 'Ошибка: ' + err);
            res.redirect('/signup');
        }
        passport.authenticate('local')(req, res, () => {
            req.flash('success_msg', 'Аккаунт успешно создан');
            res.redirect('/');
        });
    });

});


router.post('/password/change', (req, res) => {
    if (req.body.password !== req.body.confirmpassword) {
        req.flash('error_msg', "Пароли не совпадают.");
        return res.redirect('/password/change');
    }

    User.findOne({ email: req.user.email })
        .then(user => {
            user.setPassword(req.body.password, err => {
                user.save()
                    .then(user => {
                        req.flash('success_msg', 'Пароль успешно изменен');
                        res.redirect('/');
                    })
                    .catch(err => {
                        req.flash('error_msg', 'Ошибка: ' + err);
                        res.redirect('/password/change');
                    });
            });
        });
});

// вроде не полный ахтунг еще
router.post('/forgot', (req, res, next) => {
    let recoveryPassword = '';
    async.waterfall([
        (done) => {
            crypto.randomBytes(20, (err, buf) => {
                let token = buf.toString('hex');
                done(err, token);
            });
        },
        (token, done) => {
            User.findOne({ email: req.body.email })
                .then(user => {
                    if (!user) {
                        req.flash('error_msg', 'Такого пользователя не существует.');
                        return res.redirect('/forgot');
                    }

                    user.resetPasswordToken = token;
                    //30 минут на восстановление
                    user.resetPasswordExpires = Date.now() + 1800000;

                    user.save(err => {
                        done(err, token, user);
                    });
                })
                .catch(err => {
                    req.flash('error_msg', 'ERROR: ' + err);
                    res.redirect('/forgot');
                })
        },
        (token, user) => {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to: user.email,
                from: 'Приложение',
                subject: 'Восстановление аккаунта',
                text: 'Перейдите по ссылке чтобы восстановить пароль: \n\n' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'Если вы не запрашивали восстановление, проигнорируйте это письмо.'
            };
            smtpTransport.sendMail(mailOptions, err => {
                req.flash('success_msg', 'Вам отправлено письмо с ссылкой восстановления. Проверьте почту.');
                res.redirect('/forgot');
            });
        }

    ], err => {
        if (err) res.redirect('/forgot');
    });
});

router.post('/reset/:token', (req, res) => {
    async.waterfall([
        (done) => {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
                .then(user => {
                    if (!user) {
                        req.flash('error_msg', 'Ссылка на восстановление пароля недействительна.');
                        res.redirect('/forgot');
                    }

                    if (req.body.password !== req.body.confirmpassword) {
                        req.flash('error_msg', "Пароли не совпадают.");
                        return res.redirect('/forgot');
                    }

                    user.setPassword(req.body.password, err => {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(err => {
                            req.logIn(user, err => {
                                done(err, user);
                            })
                        });
                    });
                })
                .catch(err => {
                    req.flash('error_msg', 'Ошибка: ' + err);
                    res.redirect('/forgot');
                });
        },
        (user) => {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to: user.email,
                from: 'Приложение',
                subject: 'Пароль изменен',
                text: 'Здравствуйте, ' + user.name + '\n\n' +
                    'Для вашего аккаунта ' + user.email + ' был изменен пароль.'
            };

            smtpTransport.sendMail(mailOptions, err => {
                req.flash('success_msg', 'Пароль успешно изменен.');
                res.redirect('/login');
            });
        }

    ], err => {
        res.redirect('/login');
    });
});

//APP

router.get('/', isAuthenticatedUser, (req, res) => {
    Student.find({})
        .then(students => {
            res.render('index', { students: students });
        })
        .catch(err => {
            req.flash('error_msg', 'Ошибка: ' + err)
            res.redirect('/');
        })

});

router.get('/student/new', isAuthenticatedUser, (req, res) => {
    res.render('new');
});

router.get('/edit/:id', isAuthenticatedUser, (req, res) => {
    let searchQuery = { _id: req.params.id };
    Student.findOne(searchQuery)
        .then(student => {
            res.render('edit', { student: student });
        })
        .catch(err => {
            req.flash('error_msg', 'Ошибка: ' + err)
            res.redirect('/');
        });
});

//NEW
router.post('/student/new', isAuthenticatedUser, (req, res) => {

    function addFiles(prefiles) {
        return new Promise((res, rej)=>{

            if (!prefiles) res([]);
            let files = prefiles['input-fas'];
            if (!Array.isArray(files)) files = [files]

            const filesnew = files.map(e=>({
                name: e.name, 
                data: e.data, 
                size: e.size,
                mimetype: e.mimetype
            }));
            
            File.create(filesnew)
                .then(arr =>{
                    res(arr.map(e=>e._id));
                })
                .catch(err =>{
                    req.flash('error_msg', 'Ошибка: ' + err)
                    res([]);
                });
        });        
    }

    // тут либо возвращается массив со всеми id либо пустой массив
    addFiles(req.files).then(filesid => {
        let newStudent = {
            name: req.body.name,
            institute: req.body.institute,
            department: req.body.department,
            group: req.body.group,
            filesid: filesid
        };
    
        Student.create(newStudent)
            .then(student => {
                req.flash('success_msg', 'Студент добавлен в базу данных.')
                res.redirect('/');
            })
            .catch(err => {
                req.flash('error_msg', 'Ошибка: ' + err)
                res.redirect('/');
            });
    })

});

//UPDATE
router.put('/edit/:id', isAuthenticatedUser, (req, res) => {
    let searchQuery = { _id: req.params.id };
    Student.updateOne(searchQuery, {
        $set: {
            name: req.body.name,
            institute: req.body.institute,
            department: req.body.department,
            group: req.body.group
        }
    })
        .then(student => {
            req.flash('success_msg', 'Информация о студенте обновлена успешно.')
            res.redirect('/');
        })
        .catch(err => {
            req.flash('error_msg', 'Ошибка: ' + err)
            res.redirect('/');
        });
});

//DELETE
router.delete('/delete/:id', isAuthenticatedUser, (req, res) => {
    let searchQuery = { _id: req.params.id };

    function deleteFiles(filesid) {
        return new Promise((res, rej)=>{
            File.deleteMany({_id: {'$in': filesid}})
                .then(ret=>{
                    console.log(ret)
                    res(ret)
                })
                .catch(err=>{
                    req.flash('error_msg', 'Ошибка: ' + err)
                    rej(err)
                })
        })
    }

    Student.findOneAndDelete(searchQuery)
        .then(student => {
            console.log(student.filesid)
            deleteFiles(student.filesid)
                .then(()=>{
                    req.flash('success_msg', 'Студент успешно удален.')
                    res.redirect('/');
                })
                .catch(err=>{
                    req.flash('error_msg', 'Ошибка: ' + err)
                })
        })
        .catch(err => {
            req.flash('error_msg', 'Ошибка: ' + err)
            res.redirect('/');
        });
});

router.get('*', (req, res)=> {
    res.render('error');
});


module.exports = router;