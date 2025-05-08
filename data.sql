-- Create database
CREATE DATABASE IF NOT EXISTS doan_nodejs;
USE doan_nodejs;

-- Create table for categories (DanhMuc)
CREATE TABLE IF NOT EXISTS danhmuc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL
);

-- Create table for articles (BaiViet)
CREATE TABLE IF NOT EXISTS baiviet (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    views INT DEFAULT 0,
    Title VARCHAR(255) NOT NULL,
    Content TEXT NOT NULL,
    DanhMucID INT NOT NULL,
    imagePath VARCHAR(255), -- Thêm cột lưu đường dẫn hình ảnh
    FOREIGN KEY (DanhMucID) REFERENCES danhmuc(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    postId INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postId) REFERENCES baiviet(id) ON DELETE CASCADE
);
-- Create table for contacts
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    TenLH VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Message TEXT NOT NULL
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);
CREATE TABLE footer_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255),
    email VARCHAR(255),
    facebook VARCHAR(255),
    youtube VARCHAR(255)
);

CREATE TABLE subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255)
);

INSERT INTO users (username, email, password) VALUES
('nhatlam', 'nhatlam@gmail.com', '123'),
('duykhang', 'duykhang@gmail.com', '123'),
('khoinguyen', 'khoinguyen@gmail.com', '123'),
('hieunghia', 'hieunghia@gmail.com', '123');

-- Insert sample data into DanhMuc
INSERT INTO danhmuc (Title) VALUES 
('Bóng Đá'),
('game'),
('kinh tế'),
('công nghệ'),
('giải trí'),
('sức khỏe'),
('thời trang'),
('làm đẹp'),
('ẩm thực'),
('du lịch');

INSERT INTO footer_info (address, email, facebook, youtube) VALUES
('63 Huỳnh Khúc Kháng , Q1 , TP.HCM', '0306231410@caothang.edu.vn', 'https://facebook.com', 'https://www.youtube.com/@lctgroup1108');
