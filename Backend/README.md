# 🚀 Bharat API Cloud - Backend

Production-ready Node.js & Express backend architecture built with **MVC + Services Pattern**, ES Modules, and **MySQL** connection pooling.

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── config/                     # Configuration files
│   │   ├── db.config.js            # MySQL connection pool (mysql2/promise)
│   │   └── env.config.js           # Centralized environment variables
│   ├── controllers/                # HTTP Request & Response handlers
│   │   ├── auth.controller.js      # Auth endpoints handler
│   │   └── health.controller.js    # Health & status check handler
│   ├── services/                   # Business logic layer
│   │   ├── auth.service.js         # Authentication logic (register, login, JWT)
│   │   └── health.service.js       # System & database health logic
│   ├── models/                     # Database access layer
│   │   ├── user.model.js           # Parameterized MySQL queries for users
│   │   └── schema.sql              # Initial MySQL table definitions
│   ├── routes/                     # API Route declarations
│   │   ├── index.js                # Main router mounted at /api/v1
│   │   ├── auth.routes.js          # /api/v1/auth routes
│   │   └── health.routes.js        # /api/v1/health routes
│   ├── middlewares/                # Custom middlewares
│   │   ├── auth.middleware.js      # JWT token verification
│   │   ├── error.middleware.js     # Global standardized error handler
│   │   └── notFound.middleware.js  # 404 Route not found handler
│   ├── utils/                      # Shared helper utilities
│   │   ├── apiError.js             # Custom operational ApiError class
│   │   ├── apiResponse.js          # Uniform API response helper
│   │   └── asyncHandler.js         # Async error wrapper for controllers
│   ├── app.js                      # Express application setup & middleware stack
│   ├── server.js                   # Server entry point & graceful shutdown
│   └── test-server.js              # Integration verification script
├── .env.example                    # Environment template
├── .env                            # Local environment configuration
├── .gitignore                      # Git ignore rules
└── package.json                    # Dependencies and scripts
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Configure Environment Variables
Edit `.env` to match your local MySQL credentials:
```env
PORT=5002
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bharat_api_cloud
JWT_SECRET=super_secret_bharat_api_cloud_jwt_key_2026
```

### 3. Setup MySQL Database
Run the queries in `src/models/schema.sql` inside your MySQL workbench/client to create the database and tables.

### 4. Run Development Server
```bash
# Using native Node.js watch mode
npm run dev

# Or using nodemon
npm run dev:nodemon
```

### 5. Run Integration Test
```bash
npm run test
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API Root Metadata | No |
| `GET` | `/api/v1/health` | Server & MySQL Status | No |
| `POST` | `/api/v1/auth/register` | Register new user | No |
| `POST` | `/api/v1/auth/login` | Login user & get JWT | No |
| `GET` | `/api/v1/auth/me` | Current user profile | Yes (`Bearer <token>`) |

---

## 🛡️ Response Standards

### Success Response (`ApiResponse`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Server is healthy and running",
  "data": { ... }
}
```

### Error Response (`ApiError`)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid email or password"
}
```
