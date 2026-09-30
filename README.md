# Spendwise

Spendwise is a personal finance website with a connected Telegram bot. Every user has a separate workspace and starts with zero data.

## Project structure

```text
Spendwise/
├── frontend/
│   ├── index.html          Application layout
│   ├── welcome.html        Sign up and login page
│   ├── css/styles.css      Responsive light and dark design
│   └── js/
│       ├── app.js          Pages, forms, and money calculations
│       ├── api.js          Browser calls to the backend API
│       └── charts.js       Category chart calculation and markup
├── api/
│   ├── config.py           Paths and server settings
│   ├── auth.py             Password and token security functions
│   ├── routes.py           HTTP routes and validation
│   └── server.py           HTTP server startup
├── database/
│   └── storage.py          Database queries
├── telegram_bot/
│   └── bot.py              Telegram menus and money entry flow
├── server.py               Simple project entry point
└── Spendwise_Money_Flow_Test_Colab.ipynb
```

## Main features

- Dashboard: total balance, monthly income, monthly spending, net cash flow, a six month bar chart, category pie chart, and five latest entries.
- Accounts: create separate bank, wallet, cash, or savings balances. Existing accounts are read-only.
- Money In and Money Out are recorded through Telegram. The website is used to review the results.
- Reports: totals, account filter, six month chart, balances, and read-only money history.
- Telegram: connect with a one-time code, add income or spending, choose an account and category, and see balance summaries.
- Live synchronization: the website checks for Telegram updates every three seconds and refreshes totals, history, and charts automatically.

## Run locally

```powershell
cd C:\path\to\Spendwise
python server.py 8000
```

Open `http://127.0.0.1:8000`. The default database is `spendwise.sqlite3`.

## Run the Telegram bot

1. Create a bot with BotFather and copy its token.
2. Start the website and sign in.
3. In Settings, select **Create code** under Telegram bot.
4. Set the same database path and the bot token.

```powershell
$env:SPENDWISE_DB = "C:\path\to\Spendwise\spendwise.sqlite3"
$env:TELEGRAM_BOT_TOKEN = "your-token"
python -m telegram_bot.bot
```

5. Send `/connect CODE` to the bot. The code expires after ten minutes.

Keep the bot token private. Do not add it to source files or the notebook.

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/register` | Create a user and session |
| POST | `/api/login` | Sign in |
| POST | `/api/logout` | End the session |
| GET | `/api/me` | Get the signed-in user |
| GET | `/api/state` | Load the user's workspace |
| PUT | `/api/state` | Save the user's workspace |
| POST | `/api/telegram-link` | Create a one-time Telegram connection code |

## Colab

Open `Spendwise_Money_Flow_Test_Colab.ipynb` and run the cells in order. The notebook extracts this folder structure, mounts Google Drive for persistent SQLite storage, starts the server, and opens a preview.

The optional Cloudflare Quick Tunnel cell prints a public HTTPS address. Anyone can open that address while the Colab runtime and tunnel process remain active. The address changes when the tunnel is restarted.
