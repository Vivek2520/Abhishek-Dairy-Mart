# Installation & Deployment Guide

## 📦 Prerequisites

- **Node.js 18+** (https://nodejs.org)
- **npm 9+**
- **Git** (for version control)

---

## 🚀 Local Development Setup

### 1. Clone/Navigate to Project

```bash
cd "c:\Users\PC\OneDrive\Documents\Code\Pythone"
```

### 2. Install Dependencies

```bash
npm install
```

This creates `node_modules/` and `package-lock.json`.

### 3. Create Environment File

Create `.env` in project root:

```env
# Server
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-super-secret-key-at-least-32-chars-long!

# Admin
ADMIN_PASSWORD_HASH=$2a$12$...     # bcrypt hash of admin password

# Optional
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
DATA_DIR=./
WAREHOUSE_DB_URL=postgresql://user:pass@localhost:5432/warehouse
```

### 4. Start Development Server

```bash
npm run dev
```

**Expected Output:**

```
═══════════════════════════════════════════════════════════
  🚀 Abhishek Dairy & General Store API Server
═══════════════════════════════════════════════════════════
  📍 Server running on: http://localhost:3000
  🌐 Environment: development
  📦 API Base URL: http://localhost:3000/api
  ...
```

### 5. Open in Browser

- **Customer Portal:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin

---

## ✅ Verification

### Check Frontend Performance

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Reload page

**Expected metrics:**

- ⚡ DOMContentLoaded: <1.2s
- ⚡ Load: <2s
- ⚡ Initial JS: <50KB
- ⚡ Images lazy-loaded

### Check Console for Errors

Should see:

```
🚀 Initializing Abhishek Dairy Store (module version)...
[Cache] Loaded products from cache
[Cache] Products cached
[INFO] Loaded 250 products from file
✅ Application initialized
```

**Should NOT see:**

- ❌ Failed imports
- ❌ Undefined function errors
- ❌ Network 404s

### Test Key Features

- [ ] Load homepage (products appear within 2s)
- [ ] Click category filter (instant update <100ms)
- [ ] Search products (debounced, 1 request per 300ms)
- [ ] Add to cart (button feedback immediate)
- [ ] Open mobile menu (responsive on sm screens)
- [ ] Scroll product images (lazy load observed)

---

## 📊 Monitoring Performance

### Using Lighthouse (Built into Chrome)

1. Open DevTools (F12)
2. Go to **Lighthouse** tab
3. Click "Analyze page load"

**Target scores:**

- Performance: 85+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Using WebPageTest

Visit: https://www.webpagetest.org/

1. Enter: `http://localhost:3000`
2. Select mobile device simulation
3. Compare before/after metrics

---

## 🏢 Production Deployment

### Option 1: Heroku (Free tier available)

```bash
# 1. Create Heroku account: https://heroku.com

# 2. Install Heroku CLI
# Windows: Download from https://devcenter.heroku.com/articles/heroku-cli

# 3. Login
heroku login

# 4. Create app
heroku create abhishek-dairy-store

# 5. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key

# 6. Deploy
git push heroku main

# 7. View logs
heroku logs --tail
```

### Option 2: AWS EC2 / Lightsail

```bash
# 1. SSH into instance
ssh -i key.pem ec2-user@your-instance-ip

# 2. Install Node
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone repo
git clone https://github.com/you/pythone.git
cd pythone

# 4. Install & run with PM2
npm install -g pm2
npm install
pm2 start src/server.js --name "abhishek-dairy"
pm2 startup
pm2 save
```

### Option 3: Docker (Recommended for scalability)

**Create `Dockerfile`:**

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]
```

**Deploy:**

```bash
docker build -t abhishek-dairy:latest .
docker run -d -p 3000:3000 --env-file .env abhishek-dairy:latest
```

---

## 🔒 Security Checklist for Production

- [ ] Change `JWT_SECRET` to strong random string (32+ chars)
- [ ] Use HTTPS (enable with Let's Encrypt)
- [ ] Enable CORS only for your domain
- [ ] Set `NODE_ENV=production`
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting on auth endpoints
- [ ] Use secure database passwords
- [ ] Set up error logging (Sentry)
- [ ] Enable GZIP compression
- [ ] Add security headers (Helmet already configured)

---

## 📈 Scaling Tips

### 1. Enable Caching

```bash
# Add redis for caching
npm install redis
```

### 2. Use CDN for Images

- Upload `image/` folder to CloudFlare or Bunny CDN
- Update `image` URLs in code to CDN domain

### 3. Database Migration (from JSON to PostgreSQL)

```bash
npm install pg
# Then refactor services to use SQL queries
```

### 4. Load Balancing

- Use Nginx reverse proxy
- Deploy multiple Node instances
- Distribute traffic equally

---

## 🐛 Troubleshooting

### Problem: "Port 3000 already in use"

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### Problem: "Module not found" error

```bash
# Ensure all modules are properly imported with .js extension
# ❌ import { cart } from './services/cart'
# ✅ import { cart } from './services/cart.js'
```

### Problem: Images not loading

- Check `/image/` folder has files
- Verify server is serving static files correctly
- Use browser DevTools Network tab to debug 404s

### Problem: Cart not persisting

```javascript
// Check localStorage is enabled
// Some browsers restrict localStorage in private mode
if (typeof locals Storage === 'undefined') {
    console.warn('localStorage not available');
}
```

---

## 📞 Support Resources

- **Node.js Docs:** https://nodejs.org/docs
- **Express.js Guide:** https://expressjs.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **MDN Web Docs:** https://developer.mozilla.org

---

**✅ Your platform is ready for production!**
