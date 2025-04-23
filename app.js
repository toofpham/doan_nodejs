const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const port = 3000;

// Cấu hình view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'keyboard cat'
}));

// Kết nối cơ sở dữ liệu
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'doan_nodejs'
});

db.connect(err => {
    if (err) throw err;
    console.log('Kết nối MySQL thành công');
});

// Danh sách người dùng được phép quản lý
const allowedUsers = ['nhatlam', 'duykhang', 'khoinguyen', 'hieunghia'];

// Middleware kiểm tra đăng nhập
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    req.session.message = { type: 'danger', content: 'Bạn cần đăng nhập để truy cập!' };
    res.redirect('/login');
}

// Middleware kiểm tra quyền truy cập
function isAuthorized(req, res, next) {
    if (req.session.user && allowedUsers.includes(req.session.user.username)) {
        return next(); // Người dùng được phép truy cập
    }
    req.session.message = { type: 'danger', content: 'Bạn không có quyền truy cập vào trang này!' };
    res.redirect('/'); // Chuyển hướng về trang chủ
}

// Route trang chủ
app.get(['/', '/home', '/index'], (req, res) => {
    const sql = "SELECT * FROM baiviet ORDER BY id ASC";
    db.query(sql, (err, result) => {
        if (err) throw err;

        const sql2 = "SELECT Title FROM danhmuc";
        db.query(sql2, (err2, result2) => {
            if (err2) throw err2;
            res.render('index', { 
                data: { lst: result, lsttitle: result2 }, 
                session: req.session,allowedUsers
            });
        });
    });
});

// Route chi tiết bài viết
app.get('/detail/:id', (req, res) => {
    const baivietId = req.params.id;

    const sqlBaiViet = 'SELECT baiviet.*, danhmuc.Title AS category_name FROM baiviet JOIN danhmuc ON baiviet.DanhMucID = danhmuc.id WHERE baiviet.id = ?';
    db.query(sqlBaiViet, [baivietId], (err, baiviet) => {
        if (err || !baiviet[0]) {
            res.render('404', { session: req.session });
            return;
        }

        res.render('single_page', { 
            baiviet: baiviet[0], 
            session: req.session, 
            allowedUsers // Truyền allowedUsers vào EJS
        });
    });
});

// Route liên hệ
app.get('/contact', (req, res) => {
    res.render('contact', { 
        session: req.session,
        allowedUsers // Truyền allowedUsers vào EJS
    });
});

app.post('/contact', (req, res) => {
    const sql = "INSERT INTO contacts (TenLH, Email, Message) VALUES (?, ?, ?)";
    db.query(sql, [req.body.uname, req.body.mail, req.body.mess], (err, result) => {
        if (err) throw err;
        console.log("1 record inserted");
    });
    res.render('contact', { data: { TenLH: req.body.uname, Email: req.body.mail, Message: req.body.mess }, session: req.session });
});

// Route hiển thị trang đăng nhập
app.get('/login', (req, res) => {
    res.render('login', { error: null, session: req.session });
});

// Route xử lý đăng nhập
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const user = results[0];
            if (password === user.password) { 
                req.session.user = user; 
                return res.redirect('/'); 
            } else {
                return res.render('login', { error: 'Sai mật khẩu!', session: req.session });
            }
        } else {
            return res.render('login', { error: 'Người dùng không tồn tại!', session: req.session });
        }
    });
});

// Route xử lý đăng xuất
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) throw err;
        res.redirect('/login');
    });
});

// Route quản lý người dùng (chỉ truy cập được khi đã đăng nhập và có quyền)
app.get('/admin/users', isAuthenticated, isAuthorized, (req, res) => {
    const sql = "SELECT id, username, email FROM users";
    db.query(sql, (err, results) => {
        if (err) throw err;

        res.render('admin_users', { users: results, session: req.session });
    });
});

// Route thêm người dùng
app.post('/admin/users/add', isAuthenticated, isAuthorized, (req, res) => {
    const { username, email, password } = req.body;
    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    db.query(sql, [username, email, password], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: 'Người dùng mới đã được thêm!' };
        res.redirect('/admin/users');
    });
});

// Route xóa người dùng
app.post('/admin/users/delete/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = req.params.id;
    const sql = "DELETE FROM users WHERE id = ?";
    db.query(sql, [userId], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Người dùng với ID ${userId} đã bị xóa!` };
        res.redirect('/admin/users');
    });
});

// Route hiển thị form sửa người dùng
app.get('/admin/users/edit/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = req.params.id;
    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.redirect('/admin/users');
        }
        res.render('edit_user', { user: results[0], session: req.session });
    });
});

// Route xử lý sửa người dùng
app.post('/admin/users/edit/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = req.params.id;
    const { username, email } = req.body;
    const sql = "UPDATE users SET username = ?, email = ? WHERE id = ?";
    db.query(sql, [username, email, userId], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Người dùng với ID ${userId} đã được cập nhật!` };
        res.redirect('/admin/users');
    });
});

// Route hiển thị form đổi mật khẩu
app.get('/admin/users/change-password/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = req.params.id;
    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            req.session.message = { type: 'danger', content: 'Người dùng không tồn tại!' };
            return res.redirect('/admin/users');
        }
        res.render('change_password', { user: results[0], session: req.session });
    });
});

// Route xử lý đổi mật khẩu
app.post('/admin/users/change-password/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    const sql = "UPDATE users SET password = ? WHERE id = ?";
    db.query(sql, [newPassword, userId], (err, result) => {
        if (err) {
            req.session.message = { type: 'danger', content: 'Đã xảy ra lỗi khi đổi mật khẩu!' };
            return res.redirect('/admin/users');
        }
        req.session.message = { type: 'success', content: `Mật khẩu của người dùng với ID ${userId} đã được đổi thành công!` };
        res.redirect('/admin/users');
    });
});

// Route quản lý danh mục (chỉ truy cập được khi đã đăng nhập và có quyền)
app.get('/admin/categories', isAuthenticated, isAuthorized, (req, res) => {
    const sql = "SELECT * FROM danhmuc";
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('admin_categories', { categories: results, session: req.session });
    });
});

// Route quản lý bài viết (chỉ truy cập được khi đã đăng nhập và có quyền)
app.get('/admin/posts', isAuthenticated, isAuthorized, (req, res) => {
    const sql = "SELECT baiviet.*, danhmuc.Title AS category_name FROM baiviet JOIN danhmuc ON baiviet.DanhMucID = danhmuc.id";
    db.query(sql, (err, results) => {
        if (err) throw err;
        const sqlCategories = "SELECT * FROM danhmuc";
        db.query(sqlCategories, (err2, categories) => {
            if (err2) throw err2;
            res.render('admin_posts', { posts: results, categories: categories, session: req.session });
        });
    });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Bắt đầu chạy app tại http://localhost:${port}`);
});