const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
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
}

// Middleware kiểm tra quyền truy cập
function isAuthorized(req, res, next) {
    if (req.session.user && allowedUsers.includes(req.session.user.username)) {
        return next();
    }
}
// Route xử lý subscribe
app.post('/subscribe', (req, res) => {
    const { email } = req.body;
    const sql = "INSERT INTO subscribers (email) VALUES (?)";

    db.query(sql, [email], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: 'Bạn đã đăng ký nhận tin thành công!' };
        res.redirect('/');
    });
});

app.get(['/', '/home', '/index'], (req, res) => {
    const sqlArticles = "SELECT * FROM baiviet ORDER BY id DESC"; // Tất cả bài viết
    const sqlLatest = "SELECT id, Title, Content, imagePath, created_at FROM baiviet ORDER BY created_at DESC LIMIT 5"; // Bài viết mới nhất
    const sqlMostViewed = "SELECT id, Title, Content, imagePath, views FROM baiviet ORDER BY views DESC LIMIT 5"; // Bài viết xem nhiều nhất
    const sqlCategories = "SELECT Title FROM danhmuc"; // Danh mục
    const sqlFooter = "SELECT * FROM footer_info"; // Footer

    db.query(sqlArticles, (err, articles) => {
        if (err) {
            console.error('Error fetching articles:', err);
            return res.status(500).send('Error fetching articles.');
        }

        db.query(sqlLatest, (err2, latestArticles) => {
            if (err2) {
                console.error('Error fetching latest articles:', err2);
                return res.status(500).send('Error fetching latest articles.');
            }

            db.query(sqlMostViewed, (err3, mostViewedArticles) => {
                if (err3) {
                    console.error('Error fetching most viewed articles:', err3);
                    return res.status(500).send('Error fetching most viewed articles.');
                }

                db.query(sqlCategories, (err4, categories) => {
                    if (err4) {
                        console.error('Error fetching categories:', err4);
                        return res.status(500).send('Error fetching categories.');
                    }

                    db.query(sqlFooter, (err5, footerData) => {
                        if (err5) {
                            console.error('Error fetching footer data:', err5);
                            return res.status(500).send('Error fetching footer data.');
                        }

                        if (!footerData || footerData.length === 0) {
                            console.warn('Footer data is missing in the database.');
                            return res.status(500).send('Footer data is missing in the database.');
                        }

                        // Render trang index.ejs với tất cả dữ liệu
                        res.render('index', {
                            data: {
                                lst: articles, // Tất cả bài viết
                                latest: latestArticles, // Bài viết mới nhất
                                mostViewed: mostViewedArticles, // Bài viết xem nhiều nhất
                                lsttitle: categories // Danh mục
                            },
                            footerData: footerData[0],
                            session: req.session || {}, // Đảm bảo session luôn tồn tại
                            allowedUsers: allowedUsers || [] // Đảm bảo allowedUsers luôn tồn tại
                        });
                    });
                });
            });
        });
    });
});

// Route hiển thị bài viết theo danh mục
app.get('/category/:title', (req, res) => {
    const categoryTitle = decodeURIComponent(req.params.title); // Giải mã URL

    const sqlCategoryPosts = `
        SELECT baiviet.* 
        FROM baiviet 
        JOIN danhmuc ON baiviet.DanhMucID = danhmuc.id 
        WHERE danhmuc.Title = ?`;

    const sqlDanhMuc = "SELECT Title FROM danhmuc";
    const sqlFooter = "SELECT * FROM footer_info LIMIT 1";

    db.query(sqlCategoryPosts, [categoryTitle], (err, posts) => {
        if (err) {
            console.error('Error fetching posts for category:', err);
            return res.status(500).send('Error fetching posts for category.');
        }

        db.query(sqlDanhMuc, (err2, lsttitle) => {
            if (err2) {
                console.error('Error fetching categories:', err2);
                return res.status(500).send('Error fetching categories.');
            }

            db.query(sqlFooter, (err3, footerData) => {
                if (err3) {
                    console.error('Error fetching footer data:', err3);
                    return res.status(500).send('Error fetching footer data.');
                }

                res.render('category_posts', {
                    posts,
                    categoryTitle,
                    data: { lsttitle },
                    footerData: footerData.length > 0 ? footerData[0] : {},
                    session: req.session
                });
            });
        });
    });
}); 

// Route hiển thị chi tiết bài viết và tăng lượt xem
app.get('/detail/:id', (req, res) => {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) return res.status(400).send('ID không hợp lệ.');

    // Tăng số lượt xem
    const sqlIncreaseViews = "UPDATE baiviet SET views = views + 1 WHERE id = ?";
    db.query(sqlIncreaseViews, [postId], (err) => {
        if (err) {
            console.error('Error updating views:', err);
            return res.status(500).send('Error updating views.');
        }

        // Lấy thông tin bài viết
        const sqlPost = `
            SELECT baiviet.*, danhmuc.Title AS categoryName 
            FROM baiviet 
            JOIN danhmuc ON baiviet.DanhMucID = danhmuc.id 
            WHERE baiviet.id = ?`;
        const sqlRelated = `
            SELECT id, Title, imagePath 
            FROM baiviet 
            WHERE DanhMucID = (SELECT DanhMucID FROM baiviet WHERE id = ?) AND id != ? 
            LIMIT 5`;
        const sqlComments = `
            SELECT email, content 
            FROM comments 
            WHERE postId = ?`;
        const sqlFooter = "SELECT * FROM footer_info LIMIT 1"; // Truy vấn dữ liệu footer

        db.query(sqlPost, [postId], (err, postResult) => {
            if (err) throw err;
            if (postResult.length === 0) return res.status(404).send('Bài viết không tồn tại.');

            db.query(sqlRelated, [postId, postId], (err2, relatedPosts) => {
                if (err2) throw err2;

                db.query(sqlComments, [postId], (err3, comments) => {
                    if (err3) throw err3;

                    db.query("SELECT * FROM danhmuc", (err4, categories) => {
                        if (err4) throw err4;

                        db.query(sqlFooter, (err5, footerData) => {
                            if (err5) {
                                console.error('Error fetching footer data:', err5);
                                return res.status(500).send('Error fetching footer data.');
                            }

                            res.render('single_page', {
                                baiviet: postResult[0],
                                relatedPosts,
                                comments,
                                categories,
                                footerData: footerData.length > 0 ? footerData[0] : {}, // Truyền footerData vào EJS
                                session: req.session
                            });
                        });
                    });
                });
            });
        });
    });
});

// Route thêm bình luận
app.post('/detail/:id/comment', (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const { email, comment } = req.body;

    if (isNaN(postId)) return res.status(400).send('ID không hợp lệ.');

    const sql = "INSERT INTO comments (postId, email, content) VALUES (?, ?, ?)";
    db.query(sql, [postId, email, comment], (err, result) => {
        if (err) throw err;
        res.redirect(`/detail/${postId}`);
    });
});

// Route hiển thị trang liên hệ
app.get('/contact', (req, res) => {
    const sqlDanhMuc = "SELECT Title FROM danhmuc";
    const sqlFooter = "SELECT * FROM footer_info LIMIT 1"; // Truy vấn dữ liệu footer

    db.query(sqlDanhMuc, (err, lsttitle) => {
        if (err) throw err;

        db.query(sqlFooter, (err2, footerData) => {
            if (err2) {
                console.error('Error fetching footer data:', err2);
                return res.status(500).send('Error fetching footer data.');
            }

            res.render('contact', {
                data: { lsttitle }, // Truyền danh mục vào EJS
                footerData: footerData.length > 0 ? footerData[0] : {}, // Truyền footerData vào EJS
                session: req.session,
                allowedUsers
            });
        });
    });
});

// Route xử lý form liên hệ
app.post('/contact', (req, res) => {
    const { uname, mail, mess } = req.body;

    if (!uname || !mail || !mess) {
        req.session.message = { type: 'danger', content: 'Vui lòng điền đầy đủ thông tin!' };
        return res.redirect('/contact');
    }

    const sql = "INSERT INTO contacts (TenLH, Email, Message) VALUES (?, ?, ?)";
    db.query(sql, [uname, mail, mess], (err, result) => {
        if (err) throw err;

        req.session.message = { type: 'success', content: 'Cảm ơn bạn đã liên hệ với chúng tôi!' };
        res.redirect('/contact');
    });
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
        res.redirect('/');
    });
});

// Route quản lý người dùng
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
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/users');
    }

    const sql = "DELETE FROM users WHERE id = ?";
    db.query(sql, [userId], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Người dùng với ID ${userId} đã bị xóa!` };
        res.redirect('/admin/users');
    });
});

// Route hiển thị form sửa người dùng
app.get('/admin/users/edit/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/users');
    }

    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, [userId], (err, results) => { 
        if (err) throw err;
        if (results.length === 0) {
            req.session.message = { type: 'danger', content: 'Người dùng không tồn tại!' };
            return res.redirect('/admin/users');
        }
        res.render('edit_user', { user: results[0], session: req.session });
    });
});

// Route xử lý sửa người dùng
app.post('/admin/users/edit/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { username, email } = req.body;
    if (isNaN(userId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/users');
    }

    const sql = "UPDATE users SET username = ?, email = ? WHERE id = ?";
    db.query(sql, [username, email, userId], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Người dùng với ID ${userId} đã được cập nhật!` };
        res.redirect('/admin/users');
    });
});

// Route hiển thị form đổi mật khẩu
app.get('/admin/users/change-password/:id', isAuthenticated, isAuthorized, (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/users');
    }

    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, [userId], (err, results) => {
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
    const userId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;
    if (isNaN(userId) || !newPassword) {
        req.session.message = { type: 'danger', content: 'Dữ liệu không hợp lệ!' };
        return res.redirect(`/admin/users/change-password/${userId}`);
    }

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

// Route quản lý danh mục
app.get('/admin/categories', isAuthenticated, isAuthorized, (req, res) => {
    const sql = "SELECT * FROM danhmuc";
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('admin_categories', { categories: results, session: req.session });
    });
});

// Route thêm danh mục
app.post('/admin/categories/add', isAuthenticated, isAuthorized, (req, res) => {
    const { title } = req.body;
    const sql = "INSERT INTO danhmuc (Title) VALUES (?)";
    db.query(sql, [title], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: 'Danh mục mới đã được thêm!' };
        res.redirect('/admin/categories');
    });
});

// Route xóa danh mục
app.post('/admin/categories/delete/:id', isAuthenticated, isAuthorized, (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/categories');
    }

    const sql = "DELETE FROM danhmuc WHERE id = ?";
    db.query(sql, [categoryId], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Danh mục với ID ${categoryId} đã bị xóa!` };
        res.redirect('/admin/categories');
    });
});

// Route sửa danh mục
app.post('/admin/categories/edit/:id', isAuthenticated, isAuthorized, (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    const { title } = req.body;
    if (isNaN(categoryId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/categories');
    }

    const sql = "UPDATE danhmuc SET Title = ? WHERE id = ?";
    db.query(sql, [title, categoryId], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Danh mục với ID ${categoryId} đã được cập nhật!` };
        res.redirect('/admin/categories');
    });
});

// Route quản lý bài viết
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

// Cấu hình multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Thư mục lưu hình ảnh
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Đặt tên tệp duy nhất
    }
});
const upload = multer({ storage });

// Route thêm bài viết
app.post('/admin/posts/add', upload.single('image'), isAuthenticated, isAuthorized, (req, res) => {
    const { title, content, categoryId } = req.body;
    const imagePath = req.file ? `images/${req.file.filename}` : null; // Đường dẫn hình ảnh

    const sql = "INSERT INTO baiviet (Title, Content, DanhMucID, imagePath) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, content, categoryId, imagePath], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: 'Bài viết mới đã được thêm!' };
        res.redirect('/admin/posts');
    });
});

// Route xóa bài viết
app.post('/admin/posts/delete/:id', isAuthenticated, isAuthorized, (req, res) => {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/posts');
    }

    const sql = "DELETE FROM baiviet WHERE id = ?";
    db.query(sql, [postId], (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Bài viết với ID ${postId} đã bị xóa!` };
        res.redirect('/admin/posts');
    });
});

// Route sửa bài viết
app.post('/admin/posts/edit/:id', upload.single('image'), isAuthenticated, isAuthorized, (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const { title, content, categoryId } = req.body;
    const imagePath = req.file ? `images/${req.file.filename}` : null; // Đường dẫn hình ảnh mới

    if (isNaN(postId)) {
        req.session.message = { type: 'danger', content: 'ID không hợp lệ!' };
        return res.redirect('/admin/posts');
    }

    // Nếu có hình ảnh mới, cập nhật cả hình ảnh
    let sql, params;
    if (imagePath) {
        sql = "UPDATE baiviet SET Title = ?, Content = ?, DanhMucID = ?, imagePath = ? WHERE id = ?";
        params = [title, content, categoryId, imagePath, postId];
    } else {
        // Nếu không có hình ảnh mới, chỉ cập nhật các trường khác
        sql = "UPDATE baiviet SET Title = ?, Content = ?, DanhMucID = ? WHERE id = ?";
        params = [title, content, categoryId, postId];
    }

    db.query(sql, params, (err, result) => {
        if (err) throw err;
        req.session.message = { type: 'success', content: `Bài viết với ID ${postId} đã được cập nhật!` };
        res.redirect('/admin/posts');
    });
});
// Route hiển thị danh sách Subscribe
app.get('/admin/subscribers', (req, res) => {
    const sql = "SELECT * FROM subscribers ORDER BY id DESC";
    db.query(sql, (err, subscribers) => {
        if (err) {
            console.error('Error fetching subscribers:', err);
            return res.status(500).send('Error fetching subscribers.');
        }
        res.render('subscribers_list', { subscribers });
    });
});

// Route hiển thị danh sách Liên hệ
app.get('/admin/contacts', (req, res) => {
    const sql = "SELECT * FROM contacts ORDER BY id DESC";
    db.query(sql, (err, contacts) => {
        if (err) {
            console.error('Error fetching contacts:', err);
            return res.status(500).send('Error fetching contacts.');
        }
        res.render('contacts_list', { contacts });
    });
});
// Khởi động server
app.listen(port, () => {
    console.log(`Bắt đầu chạy app tại http://localhost:${port}`);
});