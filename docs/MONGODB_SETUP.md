# MongoDB Setup Guide for Abhishek Dairy Store

## Overview

This guide will help you set up MongoDB (local or cloud) for the Abhishek Dairy Store application. The project is designed to work with both **JSON file storage** (default) and **MongoDB** (optional).

---

## **Option 1: Local MongoDB Installation (Recommended for Development)**

### **1.1 Install MongoDB Community Edition**

#### **Windows:**

1. Download MongoDB Community from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. Install MongoDB as a Service (recommended)
4. MongoDB will start automatically

#### **macOS (using Homebrew):**

```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

#### **Linux (Ubuntu/Debian):**

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### **1.2 Verify MongoDB Installation**

```bash
# Try to connect to MongoDB
mongosh
```

You should see:

```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017/?directConnection=true
```

---

## **Option 2: Cloud MongoDB Setup (MongoDB Atlas)**

### **2.1 Create Free MongoDB Atlas Cluster**

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Click "Create a Project"
4. Name your project: "Abhishek-Dairy"
5. Click "Create Project"

### **2.2 Create a Database Cluster**

1. Click "Build a Database"
2. Select "M0 Free Tier"
3. Choose your cloud provider (AWS, Azure, or GCP)
4. Select region closest to you
5. Click "Create Cluster"

### **2.3 Set Up Network Access**

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (for development)
4. Click "Confirm"

### **2.4 Create Database User**

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Set username: `abhishek_user`
4. Set password: (Generate secure password - copy it!)
5. Click "Add User"

### **2.5 Get Connection String**

1. Go back to "Clusters"
2. Click "Connect" on your cluster
3. Select "Drivers"
4. Copy the connection string
5. Replace `<username>` and `<password>` with your credentials

Example:

```
mongodb+srv://abhishek_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/abhishek-dairy?retryWrites=true&w=majority
```

---

## **Step 3: Update Environment Variables**

### **3.1 Copy .env.example to .env**

```bash
cp .env.example .env
```

### **3.2 Update .env with MongoDB URI**

**For Local MongoDB:**

```env
MONGODB_URI=mongodb://localhost:27017/abhishek-dairy
USE_MONGODB=true
```

**For MongoDB Atlas (Cloud):**

```env
MONGODB_URI=mongodb+srv://abhishek_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/abhishek-dairy?retryWrites=true&w=majority
USE_MONGODB=true
```

---

## **Step 4: Update Backend to Use MongoDB**

### **4.1 Update userController to use MongoDB service**

Edit `src/controllers/userController.js` and change the import:

**Before:**

```javascript
const userService = require("../services/userService");
```

**After:**

```javascript
// Use MongoDB service if available
const userService =
  process.env.USE_MONGODB === "true"
    ? require("../services/userServiceMongo")
    : require("../services/userService");
```

### **4.2 No changes needed for other files**

The MongoDB service (userServiceMongo.js) has the same interface as the JSON service, so all controllers and routes work without modification.

---

## **Step 5: Install Dependencies**

```bash
npm install
```

---

## **Step 6: Start the Server**

```bash
npm start
```

You should see:

```
💾 Database: MongoDB  ✅
```

If MongoDB is not running, you'll see:

```
💾 Database: JSON Files
```

---

## **Step 7: Test Login/Signup**

### **7.1 Open the website**

```
http://localhost:5000
```

### **7.2 Navigate to Signup**

```
Click: Create account
or visit: http://localhost:5000/signup
```

### **7.3 Fill the form**

- **Name:** John Doe
- **Email:** john@example.com
- **Password:** Password123
- **Confirm Password:** Password123

### **7.4 Verify Email**

Check console for OTP (in development mode)

Navigate to: `http://localhost:5000/verify-email?email=john@example.com`

### **7.5 Login**

Navigate to: `http://localhost:5000/login`

- **Email:** john@example.com
- **Password:** Password123

---

## **Troubleshooting**

### **MongoDB Connection Failed**

**Error:** `MongooseError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**

1. Make sure MongoDB is running
2. Windows: Check Services ("mongod" should be running)
3. macOS/Linux: `brew services start mongodb-community` or `sudo systemctl start mongod`

### **Authentication Failed**

**Error:** `MongooseError: authentication failed`

**Solution:**

1. Check your MongoDB URI in .env
2. Verify username and password are correct
3. For Atlas, ensure IP whitelist includes your address

### **Database Empty After Login**

**Error:** User registration successful but can't login

**Solutions:**

1. Verify MongoDB is running: `mongosh`
2. Check database: `mongosh` → `use abhishek-dairy` → `db.users.find()`
3. Verify user document exists
4. Check server logs for errors

### **Fallback to JSON Storage**

**Status:** `💾 Database: JSON Files`

**Solution:**

1. If you want MongoDB: Install MongoDB and set `USE_MONGODB=true`
2. JSON storage is actually working fine for development!

---

## **Data Migration (JSON to MongoDB)**

If you have existing user data in JSON:

### **Option A: Manual Import**

1. Export users from `data/users.json`
2. Use MongoDB Compass or Atlas UI
3. Import collection manually
4. Update user `_id` to `id` field

### **Option B: Programmatic Migration**

Create `scripts/migrate-to-mongodb.js`:

```javascript
const fs = require("fs");
const User = require("../src/models/User");
const { connectDB } = require("../src/config/database");

async function migrate() {
  await connectDB();

  const usersJson = JSON.parse(fs.readFileSync("data/users.json", "utf8"));

  for (const user of usersJson) {
    try {
      await User.create(user);
      console.log(`✅ Migrated: ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed: ${user.email}`, error.message);
    }
  }

  console.log("✅ Migration complete");
  process.exit(0);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
```

Run:

```bash
node scripts/migrate-to-mongodb.js
```

---

## **MongoDB Best Practices**

### **1. Backup Your Data**

```bash
# Local MongoDB backup
mongodump --db abhishek-dairy --out ./backup

# MongoDB Atlas: Use automatic backups (enabled by default)
```

### **2. Use MongoDB Compass for GUI**

Download: https://www.mongodb.com/products/compass

Benefits:

- Visual database explorer
- Run queries easily
- Monitor performance

### **3. Indexes for Performance**

Already configured in User model (email, username, createdAt)

### **4. Production Deployment**

Use MongoDB Atlas for production:

- Automatic backups
- Automated scaling
- Built-in security
- High availability

---

## **Quick Reference**

| Task                  | Command                                           |
| --------------------- | ------------------------------------------------- |
| Start MongoDB (local) | `mongod` or brew services                         |
| Connect to MongoDB    | `mongosh`                                         |
| List databases        | `show dbs`                                        |
| Use database          | `use abhishek-dairy`                              |
| List collections      | `show collections`                                |
| View users            | `db.users.find()`                                 |
| Count users           | `db.users.countDocuments()`                       |
| Delete user           | `db.users.deleteOne({email: "test@example.com"})` |

---

## **Support & Additional Resources**

- **MongoDB Documentation:** https://docs.mongodb.com/
- **Mongoose Documentation:** https://mongoosejs.com/
- **MongoDB Atlas Guide:** https://docs.mongodb.com/atlas/
- **MongoDB Community Forums:** https://www.mongodb.com/community/forums/

---

## **Reverting to JSON Storage**

If you want to go back to JSON storage:

```env
USE_MONGODB=false
# or remove the line entirely
```

The application will automatically fall back to JSON files in `/data/` directory.

---

**Congratulations! You now have MongoDB set up for your e-commerce store!** 🎉
