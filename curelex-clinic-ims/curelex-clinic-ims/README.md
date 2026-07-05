# Curelex — Integrated Management System

A unified platform combining two independent systems into one:

- **IMS** — Inventory Management System for retail/pharmacy stock, sales, and purchases
- **Clinic** — Patient queue management system with real-time live tracking via WebSockets

---

## Project Structure

```
Curelex-IMS/
├── backend/
│   ├── server.js              # Single entry point — starts both systems
│   ├── ims/                   # IMS backend (Express app)
│   │   └── src/
│   │       ├── config/        # DB & env config
│   │       ├── controllers/   # Auth, products, sales, purchases, reports...
│   │       ├── models/        # Mongoose models
│   │       ├── routes/        # API route definitions
│   │       ├── services/      # Business logic (sales, inventory, audit)
│   │       └── middleware/    # Auth, authorization, validation
│   └── clinic/                # Clinic backend (Express app)
│       ├── config/            # DB & env config
│       ├── models/            # Mongoose models
│       ├── routes/            # API route definitions
│       ├── middleware/        # Auth middleware
│       └── utils/             # Utility functions
│
└── frontend/
    └── src/
        ├── App.jsx            # Root router — splits /ims and /clinic
        ├── index.css          # Global styles + CSS variables
        ├── ims/               # IMS frontend (React + Tailwind)
        │   ├── components/    # Layout, sidebar, topbar, charts, tables
        │   ├── context/       # Auth context
        │   ├── hooks/         # useAuth, usePermissions
        │   ├── pages/         # Dashboard, Products, Sales, Purchases...
        │   └── services/      # API service layer
        └── clinic/            # Clinic frontend (React + inline styles)
            ├── components/    # Shared UI components
            ├── context/       # App context (session management)
            ├── hooks/         # useQueueSocket (Socket.IO)
            ├── pages/         # Landing, Admin, Doctor, Receptionist dashboards
            └── utils/         # API helpers, date helpers
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Tailwind CSS, Socket.IO Client |
| Backend | Node.js, Express 5, Socket.IO |
| Database | MongoDB (Mongoose) — single Atlas cluster, separate DBs |
| Auth | JWT (separate tokens per system: `ims_token`, `clinic_token`) |
| Real-time | Socket.IO (clinic queue live tracking) |
| Charts | Recharts |

---

## Environment Variables

Create a single `.env` file inside the `backend/` folder:

```env
# Server
PORT=5000
NODE_ENV=development

# IMS Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ims_db

# Clinic Database (same cluster, different DB)
CLINIC_MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/clinic_db

# JWT
JWT_SECRET=your-strong-secret-here
JWT_EXPIRES_IN=1d

# IMS Invoice settings
INVOICE_PREFIX=INV
INVOICE_DIGITS=4
DEFAULT_GST_RATE=18

# Clinic Super Admin (auto-created on first run)
SUPER_ADMIN_EMAIL=superadmin@curelex.com
SUPER_ADMIN_PASSWORD=changeme123

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

---

## Getting Started

### 1. Backend

```bash
cd backend
npm install
node server.js
```

The server starts on `http://localhost:5000` and mounts both systems:

| System | Base URL |
|---|---|
| IMS API | `http://localhost:5000/api/ims/api/v1` |
| Clinic API | `http://localhost:5000/api/clinic` |
| Health check | `http://localhost:5000/api/health` |
| WebSockets | `ws://localhost:5000` (clinic queue) |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173`.

---

## API Reference

### IMS — `/api/ims/api/v1`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/login` | Login | ✗ |
| POST | `/auth/signup` | Register | ✗ |
| GET | `/auth/me` | Current user | ✓ |
| GET | `/products` | List products | ✓ |
| POST | `/products` | Add product | Admin |
| PUT | `/products/:id` | Update product | Admin |
| DELETE | `/products/:id` | Delete product | Admin |
| GET | `/inventory` | Stock levels | ✓ |
| GET | `/sales` | List sales | ✓ |
| POST | `/sales` | Create sale | ✓ |
| GET | `/purchases` | List purchases | Admin |
| POST | `/purchases` | Create purchase | Admin |
| GET | `/customers` | List customers | ✓ |
| GET | `/suppliers` | List suppliers | Admin |
| GET | `/reports/summary` | Sales/stock summary | Admin |

### Clinic — `/api/clinic`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new clinic | ✗ |
| POST | `/auth/login` | Login (any role) | ✗ |
| GET | `/auth/me` | Current session | ✓ |
| GET | `/patients` | List patients | ✓ |
| POST | `/patients` | Add patient + assign token | Admin/Receptionist |
| PATCH | `/patients/:id/status` | Update patient status | Admin/Receptionist/Doctor |
| PATCH | `/patients/:id/followup` | Set follow-up date | ✓ |
| PATCH | `/patients/:id/payment` | Update payment | ✓ |
| DELETE | `/patients/:id` | Delete patient | Admin/Receptionist |
| GET | `/users` | List clinic staff | Admin |
| POST | `/users` | Add staff member | Admin |
| DELETE | `/users/:id` | Remove staff | Admin |
| GET | `/clinics/me` | Clinic profile | Admin |
| PUT | `/clinics/me` | Update clinic | Admin |
| GET | `/queue/track/:token` | Live queue (public) | ✗ |
| GET | `/superadmin/clinics` | All clinics | Superadmin |

---

## Frontend Routing

```
/                       → System selection (IMS or Clinic)
/ims/login              → IMS login / signup
/ims/dashboard          → IMS dashboard (protected)
/ims/products           → Products (admin only)
/ims/inventory          → Inventory (admin only)
/ims/sales              → Sales
/ims/purchases          → Purchases (admin only)
/ims/customers          → Customers
/ims/suppliers          → Suppliers (admin only)
/ims/reports            → Reports

/clinic                 → Clinic login / register
/clinic/dashboard       → Role-based dashboard (admin/doctor/receptionist)
/clinic/superadmin      → Super admin panel
/clinic/track/:token    → Public live queue tracker (no login required)
```

---

## Roles & Permissions

### IMS
| Role | Access |
|---|---|
| `admin` | Full access to all modules |
| `staff` | Sales, customers, inventory view only |

### Clinic
| Role | Access |
|---|---|
| `superadmin` | Manages all clinics on the platform |
| `admin` | Manages their clinic — staff, patients, settings |
| `receptionist` | Add patients, manage queue tokens |
| `doctor` | View own patient queue, update status |

---

## Real-time Queue System

The clinic uses Socket.IO for live patient queue updates. When a patient's token is called or marked done, all connected trackers (patients watching `/clinic/track/:token`) receive an instant update.

**Socket events:**

| Event | Direction | Description |
|---|---|---|
| `join_queue` | Client → Server | Subscribe to a doctor's queue room |
| `queue_update` | Server → Client | Live queue state push |

**Room naming:** `queue_{clinicId}_{doctorId}_{date}`

---

## Database Models

### IMS (DB: `ims_db`)
| Model | Collection | Purpose |
|---|---|---|
| `IMSUser` | `imsusers` | Staff accounts |
| `Product` | `products` | Product catalog |
| `Inventory` | `inventories` | Stock levels |
| `Sale` | `sales` | Sales transactions |
| `Purchase` | `purchases` | Purchase orders |
| `Customer` | `customers` | Customer records |
| `Supplier` | `suppliers` | Supplier records |
| `StockMovement` | `stockmovements` | Stock audit trail |
| `AuditLog` | `auditlogs` | Action audit log |
| `Counter` | `counters` | Invoice number sequence |

### Clinic (DB: `clinic_db`)
| Model | Collection | Purpose |
|---|---|---|
| `User` | `users` | Clinic staff + admin accounts |
| `Clinic` | `clinics` | Clinic profiles |
| `Patient` | `patients` | Patient records + tokens |
| `QueueSession` | `queuesessions` | Queue session tracking |

> All models share a single MongoDB Atlas cluster across separate databases. No model name collisions — IMS User is registered as `IMSUser` to avoid conflict with Clinic `User`.

---

## Scripts

```bash
# Backend — seed demo data (IMS)
node backend/ims/src/scripts/seedAndSimulate.js

# Frontend — production build
cd frontend && npm run build

# Frontend — lint
cd frontend && npm run lint
```

---

## Deployment Notes

- Set `NODE_ENV=production` in your environment
- Set `CLIENT_URL` to your frontend domain for CORS
- Both systems share one `PORT` — deploy as a single service
- Frontend build goes to `frontend/dist/` — serve statically or via a CDN
- WebSocket support is required on your host (Render, Railway, and Fly.io support it)
