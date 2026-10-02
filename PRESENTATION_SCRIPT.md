# Spendwise Presentation Script

## 1. Introduction — about 40 seconds

Hello everyone. Today I will present Spendwise, a full stack personal expense tracker.

The purpose of Spendwise is to help each user record money coming in and going out, organize it by account and category, and understand their financial position through clear totals and charts. Every user creates an account and receives a private workspace that begins with zero data.

The project includes a responsive frontend, a Python backend API, authentication, and an SQLite database.

## 2. Main interface — about 55 seconds

After registering or signing in, the user sees the Dashboard.

The Dashboard displays four important values: total balance, Money In this month, Money Out this month, and net cash flow. Net cash flow is calculated by subtracting Money Out from Money In.

Below those values, a six month bar chart compares incoming and outgoing money. A category chart shows how spending is divided. The latest activity table displays the five newest transactions. When stored information changes, the interface reloads the workspace and redraws these sections.

## 3. Accounts and transactions — about 65 seconds

Before recording a transaction, the user creates an account. An account can represent a bank account, electronic wallet, cash, or savings. The opening balance is entered by the user, so the application does not insert example money.

The Transactions page has separate Money In and Money Out forms. The user selects an account, enters an amount and date, chooses a category, and can add a short description. A validation function checks that the account exists and that the amount is greater than zero.

When the form is submitted, the transaction is added to the current workspace and saved through the backend API. The history is read-only, which keeps the interface clear and avoids accidental changes to previous entries.

## 4. Reports and calculations — about 60 seconds

The Reports page can show all accounts or one selected account.

The `signedMoney` function converts Money In into a positive value and Money Out into a negative value. The account balance calculation begins with the opening balance and adds every signed transaction belonging to that account.

Monthly helper functions compare the year and month in each transaction date. They produce the income total, spending total, net cash flow, and the six month bar chart values.

For the category chart, the code groups Money Out transactions by category, adds the amounts, calculates each category's percentage, and generates the chart and legend.

## 5. Frontend code — about 60 seconds

The frontend is separated into focused files. `index.html` defines the application container, while `welcome.html` contains registration and login forms. `styles.css` provides the responsive layout, colors, cards, forms, tables, and light or dark theme.

In JavaScript, `app.js` controls navigation, account creation, dashboard rendering, reports, and shared calculations. `transactions.js` contains the transaction page, forms, input validation, and history table. `charts.js` prepares chart values and markup. `api.js` contains the browser requests sent to the backend.

This split keeps each file focused and makes the code easier to explain and maintain.

## 6. Backend, API, and database — about 70 seconds

The root `server.py` is the entry point. It calls `api.server`, which creates the HTTP server and initializes the database.

Inside the API folder, `routes.py` receives requests, validates their JSON data, checks authentication, and returns JSON responses. `auth.py` handles password hashing and session tokens. Passwords use PBKDF2 HMAC SHA-256 with a random salt. The browser receives a random session token, while only its secure hash is stored in the database.

The `database/storage.py` module contains the SQLite operations for users, sessions, and each user's workspace. Keeping SQL in one module avoids repeating database logic in route handlers. The workspace is stored as JSON, allowing accounts and transactions to be loaded and saved together.

## 7. Testing, deployment, and conclusion — about 55 seconds

The Colab notebook extracts the same project files, starts the application with a separate test database, checks the pages and protected API, and opens the preview. An optional tunnel can provide a temporary public address for demonstration.

For permanent deployment, the source is stored in GitHub. Render reads the repository and starts it with `python server.py`. Its health check uses `/welcome.html`, and automatic deployment publishes new commits.

In conclusion, Spendwise provides account management, transaction entry, private user data, financial calculations, visual reports, authentication, testing, and public deployment. The project demonstrates a complete frontend, backend API, and database with code separated by responsibility.
