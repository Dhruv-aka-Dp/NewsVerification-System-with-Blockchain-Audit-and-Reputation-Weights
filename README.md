# NewsVerify

A decentralized news verification platform. It uses community voting and a confidence engine to verify local news, with everything logged on a local blockchain.

## Setup

### 1. Blockchain
Go to the `blockchain` folder and start the local node:
```bash
cd blockchain
npm install
npx hardhat node
```
In a new terminal, deploy the contracts:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### 2. Backend
Start the server in the `backend` folder:
```bash
cd backend
npm install
node src/server.js
```

### 3. Frontend
The app has three different views. Start them from the `frontend` folder:
```bash
cd frontend
npm install

# Main Application (Port 5173)
VITE_APP=main npx vite --host

# Blockchain Explorer (Port 5174)
VITE_APP=explorer npx vite --host

# Admin Dashboard (Port 5175)
VITE_APP=dashboard npx vite --host
```

## Details
- **Main App:** http://localhost:5173 - Where users vote and submit news.
- **Explorer:** http://localhost:5174/explorer.html - View on-chain logs.
- **Dashboard:** http://localhost:5175/dashboard.html - View database stats.

## Accounts
- **Reviewer:** `dp@jklu.edu.in` / `demo123`
- **Admin:** `admin@newsverify.local` / `admin123`
- **Others:** `arjun@jklu.edu.in`, `priya@jklu.edu.in` / `demo123`
