<div align="center">
  <img src="frontend/public/brew_and_bite_logo.png" alt="Brew & Bite Logo" width="150"/>
  <h1>Brew & Bite</h1>
  <p><strong>A Premium Point-of-Sale & Café Management System</strong></p>
</div>

---

Brew & Bite is a full-stack, real-time Point-of-Sale (POS) and restaurant management platform built specifically for modern cafés. It streamlines the entire workflow from taking orders at the register, managing tables, sending live tickets to the kitchen, and visualizing sales data on a beautiful admin dashboard.

## ✨ Key Features

- 🖥️ **Smart POS Terminal:** An intuitive, fast checkout interface for cashiers to manage carts, apply discounts, and process payments.
- 🍳 **Live Kitchen Display System (KDS):** Real-time order synchronization using WebSockets. Kitchen staff see incoming orders instantly and can move them from "To Cook" -> "Preparing" -> "Completed".
- 📊 **Analytics Dashboard:** A comprehensive admin view featuring revenue tracking, sales trends, top-selling products, and a busy-hours heatmap using interactive charts.
- 🪑 **Table Management:** Support for both Dine-In (with visual table selection and status tracking) and Takeaway order flows.
- 👥 **Role-Based Access Control:** Distinct interfaces and permissions for Admin, Cashier, and Kitchen staff.
- 📥 **Export & Reporting:** Export filtered order data to CSV directly from the dashboard.

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS & Framer Motion for smooth animations
- **State Management:** Zustand
- **Icons:** Lucide React
- **Charts:** MUI Charts & Nivo Heatmap

### Backend
- **Server:** Node.js & Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Real-time:** Socket.IO for live kitchen and order updates
- **Authentication:** JWT (JSON Web Tokens)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dhruvesh1611/BREW-BITE.git
   cd BREW-BITE
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file in the `backend` directory based on `.env.example` (ensure you set your `DATABASE_URL`).
   - Push the database schema and seed default data:
     ```bash
     npx prisma db push
     node prisma/seed.js
     ```
   - Start the backend server:
     ```bash
     npm run dev
     ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```
   - Create a `.env.local` file in the `frontend` directory and set your API URL (e.g., `NEXT_PUBLIC_API_URL=http://localhost:4001/api`).
   - Start the frontend server:
     ```bash
     npm run dev
     ```

4. **Access the App:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Accounts

If you seeded the database using the provided seed script, you can log in with the following default accounts to test different roles:

- **Admin Dashboard:** `admin@brew-and-bite.com` | `password123`
- **Cashier (POS):** `jagjeet@brew-and-bite.com` | `password123`
- **Kitchen (KDS):** `gordon@brew-and-bite.com` | `password123`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Dhruvesh1611/BREW-BITE/issues) if you want to contribute.

## 📝 License

This project is licensed under the MIT License.
