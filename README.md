# StockFlow – Inventory Management System

StockFlow is a web-based inventory management application that helps businesses manage products, monitor stock quantities, track product prices, and identify low-stock items.

## Live Demo

- **Frontend:** https://stock-flow-inventory-management-6ok.vercel.app/
- **Backend API:** https://stockflow-inventory-management-production.up.railway.app/

## Features

- User registration and login
- Organization-based inventory workspace
- Dashboard with inventory statistics
- Add, view, edit, and delete products
- Product search and filtering
- Low-stock detection and alerts
- Product quantity tracking
- Cost price and selling price management
- Configurable low-stock thresholds
- Responsive user interface

## Technology Stack

- **Frontend:** React.js, Vite, JavaScript, CSS
- **Backend:** Python, Django, Django REST Framework
- **Authentication:** JWT
- **Database:** MySQL
- **Deployment:** Vercel and Railway

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Anil123-eng/StockFlow-Inventory-Management.git
cd StockFlow-Inventory-Management
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
```

Configure your local environment variables and MySQL database.

Run migrations and start the backend:

```bash
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend folder:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

## Deployment

- Frontend hosted on Vercel.
- Backend hosted on Railway.
- MySQL database hosted on Railway.

## Author

**M. Anil**

GitHub: https://github.com/Anil123-eng

---

*StockFlow – Simplifying Inventory Management.*
