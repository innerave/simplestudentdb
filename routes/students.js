const express = require('express');
const router = express.Router();

const Student = require('../models/student');

router.get('/', (req, res)=> {
    Student.find({})
        .then(students => {
            res.render('index', {students : students });
        })
        .catch(err=> {
            req.flash('error_msg', 'Ошибка: '+err)
            res.redirect('/');
        })
    
});

router.get('/student/new', (req,res)=> {
   res.render('new');
});

router.get('/edit/:id', (req, res)=> {
    let searchQuery = {_id : req.params.id};
    Student.findOne(searchQuery)
        .then(student => {
            res.render('edit', {student:student});
        })
        .catch(err => {
            req.flash('error_msg', 'Ошибка: '+err)
            res.redirect('/');
        });
});

//NEW
router.post('/student/new', (req,res)=> {
   let newStudent = {
       name : req.body.name,
       institute : req.body.institute,
       department : req.body.department,
       group : req.body.group
   };

   Student.create(newStudent)
       .then(student => {
           req.flash('success_msg', 'Студент добавлен в базу данных.')
           res.redirect('/');
       })
       .catch(err => {
           req.flash('error_msg', 'Ошибка: '+err)
           res.redirect('/');
       });
});

//UPDATE
router.put('/edit/:id', (req, res)=> {
    let searchQuery = {_id : req.params.id};
    Student.updateOne(searchQuery, {$set: {
        name : req.body.name,
        institute : req.body.institute,
        department : req.body.department,
        group : req.body.group
    }})
    .then(student => {
        req.flash('success_msg', 'Информация о студенте обновлена успешно.')
        res.redirect('/');
    })
    .catch(err => {
        req.flash('error_msg', 'Ошибка: '+err)
        res.redirect('/');
    });
});

//DELETE
router.delete('/delete/:id', (req, res)=> {
    let searchQuery = {_id : req.params.id};

    Student.deleteOne(searchQuery)
        .then(student=>{
            req.flash('success_msg', 'Студент успешно удален.')
            res.redirect('/');
        })
        .catch(err => {
            req.flash('error_msg', 'Ошибка: '+err)
            res.redirect('/');
        });
});

module.exports = router;