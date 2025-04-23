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
    Title VARCHAR(255) NOT NULL,
    Content TEXT NOT NULL,
    DanhMucID INT NOT NULL,
    FOREIGN KEY (DanhMucID) REFERENCES danhmuc(id) ON DELETE CASCADE
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

INSERT INTO users (username, email, password) VALUES
('nhatlam', 'nhatlam@example.com', 'password123'),
('duykhang', 'duykhang@example.com', 'password123'),
('khoinguyen', 'khoinguyen@example.com', 'password123'),
('hieunghia', 'hieunghia@example.com', 'password123');

-- Insert sample data into DanhMuc
INSERT INTO danhmuc (Title) VALUES 
('Technology'), 
('Health'), 
('Lifestyle');

-- Insert sample data into BaiViet
INSERT INTO baiviet (Title, Content, DanhMucID) VALUES 
('Tech Trends 2023', 'Content about tech trends...', 1),
('Healthy Living Tips', 'Content about health...', 2),
('Minimalist Lifestyle', 'Content about minimalism...', 3);

-- Insert sample data into Contacts
INSERT INTO contacts (TenLH, Email, Message) VALUES 
('John Doe', 'john@example.com', 'Hello, I have a question.'),
('Jane Smith', 'jane@example.com', 'I need more information.');