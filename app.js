const express=require('express');
const mysql=require('mysql');
const bodyParser=require('body-parser');
const session=require('express-session');
const app=express();
const port=3000;

app.set('view engine','ejs');
app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
    resave:false,
    saveUninitialized:false,
    secret:'keyboard cat'
}))

const db=mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'doan_nodejs'
});

db.connect(err => {
    if (err) throw err;
    console.log('Kết nối MySQL thành công');
});

app.get(['/','/home','/index'],(req,res)=>{
    var sql="SELECT * FROM baiviet ORDER BY id ASC";
    db.query(sql,function(err,result){
        if(err) throw err;
        console.log("Danh sách:", result);
        
        var sql2="SELECT Title FROM danhmuc "
        db.query(sql2,function(err2,result2){
            if(err2) throw err2
            res.render('index',{data:{lst:result,lsttitle:result2}})
        })
        
    })
})

app.get('/detail/:id',(req,res)=>{
    const baivietId=req.params.id;

    const sqlBaiViet='SELECT baiviet.*, danhmuc.Title AS category_name FROM baiviet JOIN danhmuc ON baiviet.DanhMucID = danhmuc.id WHERE baiviet.id = ?'
    db.query(sqlBaiViet,[baivietId],(err,baiviet)=>{
        if(err||!baiviet[0]){
            res.render('404');
            return;
        }

        res.render('single_page',{baiviet:baiviet[0]})
    })
})

app.get(['/contact'],(req,res)=>{
    res.render('contact')
})
app.post('/contact',(req,res)=>{
    var sql="INSERT INTO contacts (TenLH,Email,Message) VALUES ('"+req.body.uname+"', '"+req.body.mail+"', '"+req.body.mess+"')";
    db.query(sql,function(err,result){
        if(err) throw err
        console.log("1 record inserted")
    })
    res.render('contact',{data:{TenLH:req.body.uname,Email:req.body.mail,Message:req.body.mess}})
})
app.get(['/404'],(req,res)=>{
    res.render('404')
})
app.listen(3000,(req,res)=>{
    console.log("Bắt đầu chạy app :)))")
})