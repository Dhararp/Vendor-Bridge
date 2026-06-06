<div align="center">

# 🏢 VendorBridge

### Enterprise Procurement & Vendor Management ERP

**A full-stack, production-ready procurement platform built with React, Node.js, Express & MongoDB.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[🚀 Features](#-features) · [🛠 Tech Stack](#-tech-stack) · [⚡ Quick Start](#-quick-start) · [🔐 Credentials](#-default-credentials) · [📋 Workflow Guide](#-end-to-end-workflow) · [📁 Structure](#-project-structure)

---

</div>

## 📌 Overview

**VendorBridge** is a centralized Enterprise Resource Planning (ERP) platform that digitizes and streamlines the complete procurement lifecycle for organizations of any size. From vendor onboarding to invoice payment — every step is tracked, role-gated, and audited.

> ✅ **Works immediately out of the box** — no database required. Falls back to LocalStorage automatically if MongoDB is unavailable.

---

## ✨ Features

### 🔐 Role-Based Access Control (RBAC)

Four distinct user roles with JWT-secured API routes and a one-click demo switcher for presentations:

| Role | Capabilities |
|---|---|
| 👷 **Procurement Officer** | Create & publish RFQs, compare quotations, generate Purchase Orders, track invoices |
| 🏭 **Vendor** | View assigned RFQs, submit competitive bids, receive POs, submit invoices |
| ✅ **Manager / Approver** | Review submitted quotations, authorize approvals, add remarks |
| 🛡️ **System Admin** | Register & approve vendor profiles, manage vendor status, access full audit logs |

### 📊 Core Modules

- **📋 Vendor Directory** — Register vendors, approve/blacklist profiles, view ratings and GST details
- **📝 RFQ Management** — Draft and publish Requests for Quotation with product specs, quantities, and deadlines
- **💰 Quotation Bidding** — Vendors submit competitive price bids; deadline enforcement built-in
- **⚖️ Comparison Matrix** — Side-by-side quotation comparison with automatic lowest-price highlighting
- **✍️ Approval Workflows** — Multi-step manager authorization with remarks and rejection tracking
- **📦 Purchase Orders** — Auto-generate POs from approved quotations with unique PO numbers
- **🧾 Invoice Management** — Vendors submit invoices; officers mark payment status
- **🖨️ Print & PDF Export** — Clean `@media print` optimized invoice layout for professional printing
- **📈 Reports & Analytics** — Spend analytics dashboard, vendor performance metrics, procurement KPIs
- **🕵️ Audit Logs** — Chronological activity timeline for every transaction and authorization event

### 🏗️ Technical Highlights

- **Dual-Mode Architecture**: Seamlessly falls back from MongoDB → in-memory backend → LocalStorage with zero user disruption
- **JWT Authentication**: All API routes protected with `Bearer` token authentication
- **Glassmorphic UI**: Premium dark-mode design with smooth animations, gradients, and micro-interactions
- **Responsive Layout**: Works on desktop, tablet, and mobile browsers
- **Auto-Seeding**: Default users and vendors are automatically created in MongoDB on first launch

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, Vanilla CSS (Glassmorphic Design) |
| **Backend** | Node.js 18+, Express 4, JWT (`jsonwebtoken`), bcryptjs |
| **Database** | MongoDB Atlas (Mongoose ODM) with in-memory + LocalStorage fallback |
| **Icons** | Lucide React |
| **Dev Tools** | Nodemon, ESModules |

---

## 📁 Project Structure

```text
vendor-bridge/
├── backend/
│   ├── models/
│   │   └── Schemas.js        # Mongoose schemas: User, Vendor, RFQ, Quotation, PO, Invoice, ActivityLog
│   ├── routes/
│   │   └── api.js            # All REST API routes with JWT auth, RBAC middleware & in-memory fallback
│   ├── .env                  # Environment config (PORT, JWT_SECRET, MONGO_URI)
│   ├── server.js             # Express app entry point + MongoDB connection
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main application: routing, state, all UI components
│   │   ├── api.js            # API client with safeFetch, auth headers & LocalStorage fallback
│   │   ├── index.css         # Global styles, glassmorphic design system, print stylesheet
│   │   └── main.jsx          # React DOM entry point
│   ├── index.html            # HTML shell with SEO meta tags
│   ├── vite.config.js        # Vite dev server config (port 3000)
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

- [Node.js v18+](https://nodejs.org/) installed
- (Optional) [MongoDB Atlas](https://www.mongodb.com/atlas) account for persistent data
- (Optional) [MongoDB Compass](https://www.mongodb.com/products/compass) to view database contents

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/vendor-bridge.git
cd vendor-bridge
```

---

### 2️⃣ Set Up the Backend

```bash
cd backend
npm install
```

**Configure environment variables** — open `backend/.env`:

```env
PORT=5000
JWT_SECRET=vendorbridge_super_secret_jwt_key

# Optional: Connect to MongoDB (Local or Atlas)
# Leave blank to run in In-Memory Demo Mode
MONGO_URI=mongodb://localhost:27017/vendorbridge

# OR use MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/vendorbridge?retryWrites=true&w=majority
```

**Start the backend server:**

```bash
npm run dev
```

> ✅ Server starts on **<http://localhost:5000>**  
> 🟡 If `MONGO_URI` is not set or fails, the app automatically runs in **In-Memory Mode** — all features still work!

---

### 3️⃣ Set Up the Frontend

Open a **new terminal window**:

```bash
cd frontend
npm install
npm run dev
```

> ✅ Frontend starts on **<http://localhost:3000>**

---

### 4️⃣ Open in Browser

Navigate to **[http://localhost:3000](http://localhost:3000)**

The login page will appear pre-filled with the default officer credentials. Click **Sign In** or use the **Demo Switcher** bar at the top.

---

## 🔐 Default Credentials

Use these accounts to log in, or click the **🎛️ Demo Switcher** at the top of the app to switch roles instantly:

| Role | Email | Password |
|---|---|---|
| 👷 Procurement Officer | `officer@vendorbridge.com` | `password` |
| 🏭 Vendor (TechnoCorp) | `vendor@technocorp.com` | `password` |
| ✅ Manager / Approver | `manager@vendorbridge.com` | `password` |
| 🛡️ System Admin | `admin@vendorbridge.com` | `password` |

> 💡 You can also **Sign Up** to create new accounts. Vendor accounts created via sign-up start with **Pending** status and must be approved by an Admin.

---

## 📋 End-to-End Workflow

Follow this complete procurement cycle to see all features in action:

```
Officer → Creates RFQ → Assigns Vendors
    ↓
Vendor → Views RFQ → Submits Quotation (with pricing)
    ↓
Officer → Compares Bids → Submits best quote for Approval
    ↓
Manager → Reviews → Approves Quotation (with remarks)
    ↓
Officer → Generates Purchase Order (PO)
    ↓
Vendor → Receives PO → Submits Invoice
    ↓
Officer → Reviews Invoice → Records Payment ✅
    ↓
Reports → Updated spend analytics & vendor metrics
```

### Step-by-Step Demo Guide

1. **Login as Procurement Officer** → Go to **RFQs & Bidding** → Click **Draft & Publish RFQ**
   - Add product name + quantity, set a future deadline, assign **TechnoCorp Solutions**, click **Dispatch**

2. **Switch → Vendor (TechnoCorp)** → Go to **RFQs & Bidding**
   - Find the RFQ → Click **Submit Quote** → Enter unit price & delivery timeline → Click **Submit Bidding Quotation**

3. **Switch → Procurement Officer** → Go to **Compare Quotations**
   - Select the RFQ from the dropdown → Review side-by-side cards → Click **Submit for Approvals**

4. **Switch → Manager (Approver)** → Go to **Workflows & Approvals**
   - Find the pending quotation → Click **✅ Approve** → Add remarks → Click **Confirm Approval**

5. **Switch → Procurement Officer** → Go to **POs & Invoices**
   - Find the approved RFQ → Click **Convert to Purchase Order**

6. **Switch → Vendor (TechnoCorp)** → Go to **POs & Invoices**
   - Find your Purchase Order → Click **Submit Invoice**

7. **Switch → Procurement Officer** → Go to **POs & Invoices → Invoices Ledger**
   - Click **View Invoice** → Print PDF or Simulate Email → Click **Record Payment**

8. **Go to Reports & Analytics** → See updated spend graphs and vendor ratings 📊

---

## 🔧 How to Add a New Vendor (Admin Guide)

1. Use the Demo Switcher → click **"System Admin"**
2. Go to **Vendors** tab in the sidebar
3. Click **➕ Add New Vendor Record**
4. Fill in:
   - **Company Name** — e.g. `Zenith Technologies Ltd`
   - **Business Category** — select from dropdown
   - **GST Number** — e.g. `29ABCDE1234F1Z5`
   - **Contact Email & Phone**
5. Click **Save Vendor Profile** — vendor is added with **Pending** status
6. In the vendor table, click the **✅ green approve button** to activate them for RFQ bidding

---

## 🛡️ Security Features

- ✅ **JWT Authentication** on all protected API routes
- ✅ **Role-based route guards** (`requireRole` middleware)
- ✅ **Bcrypt password hashing** (salted, 10 rounds)
- ✅ **Input validation** on all POST/PATCH endpoints
- ✅ **Deadline enforcement** — vendors cannot bid on expired RFQs
- ✅ **Assignment enforcement** — vendors can only bid on RFQs they are assigned to
- ✅ **Token stored in localStorage** — cleared on logout

---

## 🌐 API Endpoints

| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Login and receive JWT |
| `GET` | `/api/vendors` | Officer, Manager, Admin | List all vendors |
| `POST` | `/api/vendors` | Admin | Register a new vendor |
| `PATCH` | `/api/vendors/:id/status` | Admin | Approve / blacklist vendor |
| `GET` | `/api/rfqs` | All (filtered by role) | List RFQs |
| `POST` | `/api/rfqs` | Officer | Create a new RFQ |
| `GET` | `/api/quotations` | All (filtered by role) | List quotations |
| `POST` | `/api/quotations` | Vendor | Submit a quotation |
| `POST` | `/api/quotations/:id/approve` | Manager | Approve a quotation |
| `GET` | `/api/purchase-orders` | All (filtered by role) | List purchase orders |
| `POST` | `/api/purchase-orders` | Officer | Generate a purchase order |
| `GET` | `/api/invoices` | All (filtered by role) | List invoices |
| `POST` | `/api/invoices` | Vendor | Submit an invoice |
| `PATCH` | `/api/invoices/:id/status` | Officer | Mark invoice as paid |
| `GET` | `/api/logs` | All authenticated | View activity logs |
| `GET` | `/api/analytics/dashboard` | All authenticated | Dashboard stats |

---

## 📝 License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it.

---

## 👥 Team

This project was built with passion by a team of three developers:

| 👤 Name | 🛠 Role |
|---|---|
| **Dhara** | Full-Stack Lead — Backend API, Authentication, Database Design |
| **Swet Kalathiya** | Frontend Developer — UI Components, Workflows & Styling |
| **Sneh Moradiya** | Full-Stack Developer — Quotation System, PO & Invoice Module |

> 💡 Built as a collaborative team project to deliver a complete, production-ready ERP system.

---

## 🙏 Acknowledgements

- Built with [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- Icons by [Lucide](https://lucide.dev/)
- Database by [MongoDB Atlas](https://www.mongodb.com/atlas)
- Design inspired by modern glassmorphic UI trends

---

<div align="center">

Made with ❤️ by **Dhara**, **Swet Kalathiya** & **Sneh Moradiya**

⭐ **Star this repo if you found it useful!**

</div>
