# Abhishek Dairy & General Store - E-Commerce Website

A production-ready e-commerce website for a neighborhood dairy and general store built with Node.js, Express, and vanilla JavaScript.

## Features

- 🛒 **Product Catalog** - Browse dairy, groceries, snacks, beverages, and more
- 🔍 **Search & Filter** - Find products by category or search term
- 🛵 **Home Delivery** - Order via WhatsApp with home delivery
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🔒 **Secure** - Production-ready security features

## Tech Stack

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation

### Frontend

- **HTML5** - Semantic markup
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** - Icons

## Project Structure

```
Pythone/
├── src/
│   ├── config/
│   │   └── index.js         # Configuration management
│   ├── controllers/
│   │   ├── productController.js
│   │   └── orderController.js
│   ├── middleware/
│   │   ├── security.js      # Helmet, CORS, rate limiting
│   │   └── validation.js   # Input validation
│   ├── routes/
│   │   ├── productRoutes.js
│   │   └── orderRoutes.js
│   ├── services/
│   │   ├── productService.js
│   │   └── orderService.js
│   ├── utils/
│   │   ├── AppError.js     # Custom error class
│   │   └── errorController.js
│   └── server.js            # Main server file
├── public/
│   └── js/
│       ├── components/
│       │   └── productCard.js
│       ├── services/
│       │   ├── api.js
│       │   └── cart.js
│       ├── utils/
│       │   └── helpers.js
│       └── main.js
├── products.json            # Product data
├── orders.json             # Order data
├── package.json
└── index.html              # Frontend
```

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm (comes with Node.js)

### Installation

1. **Clone the repository**

2. **Install dependencies**

```
bash
   cd Pythone
   npm install

```

3. **Start the server**

```
bash
   npm start

```

The server will start on `http://localhost:5000`

4. **Open in browser**
   - Visit `http://localhost:5000`

### Development Mode

For auto-reload during development:

```
bash
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
bash
cp .env.example .env
```

| Variable         | Description         | Default      |
| ---------------- | ------------------- | ------------ |
| `PORT`           | Server port         | 5000         |
| `NODE_ENV`       | Environment         | development  |
| `WHATSAPP_PHONE` | WhatsApp number     | 917879355368 |
| `CORS_ORIGIN`    | CORS allowed origin | \*           |

## API Endpoints

### Products

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/api/products`             | Get all products         |
| GET    | `/api/products/:id`         | Get single product       |
| GET    | `/api/categories/:category` | Get products by category |
| GET    | `/api/products/stats`       | Get product statistics   |

### Orders

| Method | Endpoint               | Description      |
| ------ | ---------------------- | ---------------- |
| POST   | `/api/orders`          | Create new order |
| GET    | `/api/orders`          | Get all orders   |
| GET    | `/api/orders/:orderId` | Get single order |

### Utilities

| Method | Endpoint      | Description  |
| ------ | ------------- | ------------ |
| GET    | `/api/health` | Health check |

## Security Features

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Rate limiting (100 requests/15 min)
- ✅ Input validation and sanitization
- ✅ XSS protection in frontend
- ✅ Request ID tracking

## Image Serving

Images are served from the `/image` route:

- `/image/filename.png` - Direct access
- `/images/filename.png` - Backward compatibility

## WhatsApp Ordering

Orders are placed through WhatsApp with:

- Customer details
- Order items with quantities
- Bill summary
- Delivery address

## Data Storage

- Products: `products.json`
- Orders: `orders.json`

Both are JSON files stored in the project root.

## Troubleshooting

### Port already in use

```bash
# Find and kill process on port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### Products not loading

1. Check `products.json` exists
2. Verify JSON syntax is valid
3. Check server logs for errors

## License

MIT License - feel free to use this for your own store!

## Credits

- **Store**: Abhishek Dairy & General Store
- **Location**: Dhotti, Waidhan, Singrauli, MP
- **Contact**: 7879355368, 7000755886
