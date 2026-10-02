# Spendwise

Spendwise is a full stack personal finance website. Each registered user has a separate workspace that starts with zero data.

## Project structure

```text
Spendwise/
├── frontend/
│   ├── index.html          Application layout
│   ├── welcome.html        Sign up and login page
│   ├── css/styles.css      Responsive light and dark design
│   └── js/
│       ├── app.js          Navigation, accounts, reports, and calculations
│       ├── api.js          Browser calls to the backend API
│       ├── charts.js       Chart calculation and markup
│       └── transactions.js Transaction forms, validation, and history
├── api/
│   ├── config.py           Paths and server settings
│   ├── auth.py             Password and session security
│   ├── routes.py           HTTP routes and validation
│   └── server.py           HTTP server startup
├── database/
│   └── storage.py          SQLite queries
├── server.py               Project entry point
├── PRESENTATION_SCRIPT.md  Five-to-seven-minute presentation script
└── Spendwise_Money_Flow_Test_Colab.ipynb
```

## Main features

- Dashboard: total balance, monthly income, monthly spending, net cash flow, a six month bar chart, a category chart, and the five latest transactions.
- Accounts: create separate bank, wallet, cash, or savings accounts with an opening balance.
- Transactions: record Money In and Money Out with an account, amount, date, category, and description.
- Reports: filter by account and view totals, a six month chart, account balances, and read-only money history.
- Authentication: each user signs up, signs in, and accesses only their own saved information.

## Run locally

```powershell
cd C:\path\to\Spendwise
python server.py 8000
```

Open `http://127.0.0.1:8000`. The default database is `spendwise.sqlite3`.

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/register` | Create a user and session |
| POST | `/api/login` | Sign in |
| POST | `/api/logout` | End the session |
| GET | `/api/me` | Get the signed-in user |
| GET | `/api/state` | Load the user's workspace |
| PUT | `/api/state` | Save the user's workspace |

## Deploy from GitHub to Render

Create a Render Web Service from the GitHub repository and use these settings:

- Runtime: Python 3
- Build command: leave empty
- Start command: `python server.py`
- Health check path: `/welcome.html`

Set `SPENDWISE_DB` to `/var/data/spendwise.sqlite3` only when the Render service has a persistent disk mounted at `/var/data`. Otherwise, omit the variable and understand that the free service filesystem can reset.

## Colab

Open `Spendwise_Money_Flow_Test_Colab.ipynb` and run the cells in order. The notebook extracts the project, mounts Google Drive for persistent SQLite storage, starts the server, and opens a preview.

The optional Cloudflare Quick Tunnel cell prints a temporary public HTTPS address. The address works while the Colab runtime and tunnel process remain active and changes after restarting the tunnel.
