# Sales Orders

Simple web app for sales agents to take client orders and for office managers to prepare them.

## Features

- **Agents**: search products by last 4 barcode digits or partial description, add quantity, remove mistakes
- **Managers**: see all orders, mark as preparing/ready, fix items, view activity log
- **Audit trail**: every add, remove, status change, and login is logged with who did it

## Quick start

```bash
cd sales-orders
npm install
npm run dev
```

Open http://localhost:3000

### Demo logins

| Role    | Name       | PIN  |
|---------|------------|------|
| Agent   | Ana Agent  | 1234 |
| Agent   | Beni Agent | 1234 |
| Manager | Manager    | 0000 |

## How agents use it

1. Sign in with your name + PIN
2. Start a new order (optional client name)
3. Search: type **4 digits** (e.g. `1012`) or **part of product name** (e.g. `coca`)
4. Pick the product, set quantity, tap **Add**
5. Remove wrong lines with **Remove** (logged, not deleted)

## How managers use it

1. Sign in as Manager
2. See incoming orders (filter by status)
3. Open an order → **Start preparing** → **Mark ready**
4. Remove wrong items if agent called in a correction
5. **Show activity log** to see full history

## Data

- Orders saved in `data/store.json` on the server PC

## Network access (phones on same Wi‑Fi)

Run with your PC's IP so agents can use phones:

```bash
npm run dev -- -H 0.0.0.0
```

Then open `http://YOUR-PC-IP:3000` on the phone.
