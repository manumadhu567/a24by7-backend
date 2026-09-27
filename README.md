# A24by7 Platform — Backend API

Production-oriented Node.js/Express backend for the A24by7 platform.

The backend provides authentication, account management, sessions, email verification, password reset, security middleware, health checks, and MySQL database integration.

---

## 1. Technology Stack

- **Runtime:** Node.js 20+
- **Language:** JavaScript / ES Modules
- **Web Framework:** Express.js 4.x
- **Database:** MySQL
- **Database Driver:** mysql2
- **Password Hashing:** Argon2id
- **Security:** Helmet, CORS, rate limiting
- **Logging:** Morgan
- **Configuration:** dotenv

---

## 2. Folder Structure

```text
backend/
│
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── env.js
│   │
│   ├── controllers/
│   │   └── auth.controller.js
│   │
│   ├── database/
│   │   ├── migrate.js
│   │   ├── schema.sql
│   │   └── migrations/
│   │       └── 001_create_auth_schema.sql
│   │
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── rateLimiter.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── health.routes.js
│   │
│   ├── services/
│   │   ├── account.service.js
│   │   ├── auth.service.js
│   │   ├── emailVerification.service.js
│   │   ├── maintenance.service.js
│   │   ├── passwordReset.service.js
│   │   └── session.service.js
│   │
│   ├── utils/
│   │   ├── security.js
│   │   └── validation.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md