# MySQL Database Integration Guide

## Abhishek Dairy & General Store

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running the Server](#running-the-server)
5. [API Testing](#api-testing)
6. [Frontend Integration](#frontend-integration)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before starting, ensure you have:

1. **Node.js** (v18+) installed
2. **XAMPP** (or MySQL) installed and running
3. **MySQL service started** in XAMPP Control Panel
4. **phpMyAdmin** access (optional, for viewing data)

---

## 🗄️ Database Setup

### Option 1: Using phpMyAdmin (Recommended)

1. Open XAMPP Control Panel
2. Click "Admin" next to MySQL → Opens phpMyAdmin
3. Create new database: `mywebsite_db`
4. Click "Import" tab
5. Choose file: `database/schema.sql`
6. Click "Go" to execute

### Option 2: Using Command Line

```bash
# Open MySQL CLI
mysql -u root

# Create database
CREATE DATABASE mywebsite_db;
USE mywebsite_db;

# Run schema
SOURCE path/to/database/schema.sql;
```

### Option 3: Auto-Creation (Automatic)

The server will automatically create all tables on first run!

---

## ⚙️ Environment Configuration

### Step 1: Create .env file

Create a file named `.env` in `backend/` folder:

```env
PORT=5000
NODE_ENV=development

# MySQL - Update these with your credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=mywebsite_db

# JWT Secret - Change in production!
JWT_SECRET=your-secret-key-here
```

### Step 2: Database Credentials

| Setting     | Default Value | Description                      |
| ----------- | ------------- | -------------------------------- |
| DB_HOST     | localhost     | MySQL server host                |
| DB_USER     | root          | MySQL username (XAMPP default)   |
| DB_PASSWORD | (empty)       | MySQL password (empty for XAMPP) |
| DB_NAME     | mywebsite_db  | Database name                    |

---

## 🚀 Running the Server

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Start MySQL

Make sure MySQL is running in XAMPP!

### Step 3: Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

### Expected Output

```
[Server] Testing database connection...
[Server] ✅ Database connection successful
[Server] Initializing database tables...
[DB] ✓ Users table ready
[DB] ✓ Categories table ready
[DB] ✓ Products table ready
[DB] ✓ Orders table ready
[DB] ✓ Coupons table ready
[DB] ✓ Default admin user created
[DB] ✅ Database initialization complete!

============================================
🚀 Abhishek Dairy Server Started
============================================
📍 Server:   http://localhost:5000
📦 API:      http://localhost:5000/api
🖼️  Images:   http://localhost:5000/image/
👤 Admin:    http://localhost:5000/admin
```

---

## 🧪 API Testing

### Health Check

```bash
curl http://localhost:5000/api/health
```

**Response:**

```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2024-..."
}
```

---

### User Authentication APIs

#### 1. Register New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "password123"
  }'
```

#### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Response includes JWT token:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

#### 3. Get Profile (Protected)

```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Product APIs

#### Get All Products

```bash
curl http://localhost:5000/api/products
```

#### Get Products by Category

```bash
curl "http://localhost:5000/api/products?category=Dairy"
```

---

### Order APIs

#### Create Order

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "9876543210",
    "items": [
      {"productId": 1, "name": "Amul Butter", "price": 225, "quantity": 2}
    ],
    "totalAmount": 450
  }'
```

---

### Admin APIs

#### Admin Login

```bash
curl -X POST http://localhost:5000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@abhishek.com",
    "password": "admin123"
  }'
```

**Default Admin Credentials:**

- Email: `admin@abhishek.com`
- Password: `admin123`

#### Get All Users (Admin Only)

```bash
curl http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Get Dashboard Stats (Admin Only)

```bash
curl http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🌐 Frontend Integration

### Login Page

The login form now calls the MySQL-backed API:

```javascript
// Frontend makes POST request
fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

### Signup Page

User registration directly stores to MySQL database.

### Admin Dashboard

Admin dashboard now uses JWT authentication:

1. Admin logs in → Gets JWT token
2. Token stored in localStorage
3. All admin API calls include: `Authorization: Bearer TOKEN`

---

## 🔧 Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Solution:**

- Check MySQL is running in XAMPP
- Verify DB_PASSWORD in .env (should be empty for XAMPP)
- Grant permissions:
  ```sql
  GRANT ALL PRIVILEGES ON mywebsite_db.* TO 'root'@'localhost';
  FLUSH PRIVILEGES;
  ```

### Error: "Can't connect to MySQL server"

**Solution:**

1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for green light

### Error: "Database 'mywebsite_db' doesn't exist"

**Solution:**

1. Create database in phpMyAdmin, OR
2. Server will auto-create on first run

### Error: "Token expired"

**Solution:**

- User needs to login again
- Token expires after 24 hours

---

## 📁 File Structure

```
my-website/
├── backend/
│   ├── src/
│   │   ├── server.js          # Main server file
│   │   ├── config/
│   │   │   ├── db.js          # MySQL connection pool
│   │   │   └── initDb.js      # Database initialization
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT authentication
│   │   └── routes/
│   │       ├── authRoutes.js         # User auth APIs
│   │       ├── adminUserRoutes.js     # Admin APIs
│   │       ├── productRoutes.js       # Product APIs
│   │       └── orderRoutes.js         # Order APIs
│   ├── .env                   # Environment variables
│   └── package.json
├── database/
│   └── schema.sql            # SQL schema
└── frontend/
    └── public/
        ├── signup.html       # Updated signup
        ├── login.html        # Updated login
        ├── profile.html      # Updated profile
        └── admin/
            └── dashboard.html # Admin panel
```

---

## 🔐 Security Notes

1. **Change JWT_SECRET** in production to a random string
2. **Use HTTPS** in production
3. **Hash passwords** are stored (bcrypt)
4. **SQL injection** protection via prepared statements
5. **Input validation** via express-validator

---

## ✅ Quick Start Checklist

- [ ] MySQL running in XAMPP
- [ ] Database created (`mywebsite_db`)
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Server running (`npm run dev`)
- [ ] Health check passing (`/api/health`)
- [ ] Admin login working
- [ ] User registration working

---

**Need Help?** Check the troubleshooting section above or review server logs!
