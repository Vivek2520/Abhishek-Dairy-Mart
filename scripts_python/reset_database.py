"""
Reset MySQL Database Script
Drops and recreates the database with fresh schema
"""

import mysql.connector
import sys

def reset_database():
    print("[DB] Connecting to MySQL...")
    
    try:
        # Connect without database first
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            port=3306
        )
        cursor = conn.cursor()
        
        print("[DB] Dropping existing database...")
        cursor.execute("DROP DATABASE IF EXISTS mywebsite_db")
        
        print("[DB] Creating new database...")
        cursor.execute("CREATE DATABASE mywebsite_db")
        
        cursor.close()
        conn.close()
        
        print("[DB] Database reset successful!")
        
        # Now connect to the new database and create tables
        print("[DB] Creating tables...")
        
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='mywebsite_db'
        )
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                phone VARCHAR(20),
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                is_email_verified BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL
            )
        """)
        
        # Create categories table
        cursor.execute("""
            CREATE TABLE categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                parent_id INT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Create products table
        cursor.execute("""
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id VARCHAR(50) UNIQUE,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                category_id INT,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                discount DECIMAL(5, 2) DEFAULT 0,
                stock INT DEFAULT 0,
                unit VARCHAR(20) DEFAULT 'piece',
                image VARCHAR(255),
