# Personal Finance Budget App

## Stack

- Node.js + Express 5 (CommonJS)
- MySQL + mysql2 connection pool
- SQL stored procedures
- HTML, CSS, JavaScript, jQuery
- Bootstrap 5 + Bootstrap Icons

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

- Copy `.env.example` to `.env`
- Update DB credentials and port

3. Run in development mode:

```bash
npm run dev
```

4. Open in browser:

- `http://localhost:3000`

## Monthly expense report

Open **Reports**, select a month, and choose **Generate report**. The current month loads automatically.
Use **Is Regular** to select **All**, **Yes**, or **No**. Changing the filter refreshes the report;
category totals and the grand total include only matching expenses. Categories with no matches are
omitted. The API accepts optional `isRegular=true` or `isRegular=false`; omit it for all expenses.
The report lists recorded expense transactions by category, with date, account, category subtotals,
and a grand total. Transaction notes supply expense descriptions; missing notes use the transaction ID.
Income, assets, and pending bank imports are excluded. Historical expenses in inactive accounts or
categories are included. Empty months show a zero grand total.

API: `GET /api/reports/monthly-expenses?year=2026&month=9`.

Expenses include an **Is Regular** Yes/No field (default **No**) in creation, editing, bank import
completion, transaction lists, and reports. The API accepts `isRegular` as a boolean. This flag does
not generate recurring transactions. Existing installations must run the regular-expenses migration
before deploying this version; see `../SW365.Carina.Deployment/README.md`.

Run report checks with `node --test test/monthly-expenses.test.js` (database calls are stubbed).

## Development commands

- `npm start` - run server once
- `npm run dev` - run with nodemon
- `npm run lint` - lint JS files
- `npm run format` - format all files
- `npm run format:check` - verify formatting

## Initial Structure

```text
src/
  app.js
  server.js
  config/db.js
  routes/
  controllers/
  services/
  middleware/
public/
  index.html
  pages/
  js/
  css/
sql/
  schema.sql
  procedures.sql
```
