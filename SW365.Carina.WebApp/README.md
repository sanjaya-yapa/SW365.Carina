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

## Transaction owners

Open **Transactions → Owners** (or **Manage owners** beside the owner selector) to
create and edit owners. First and last names are required; full name is generated
automatically. Email address and phone number are optional. Owners are independent
of accounts and login users, and one owner can have multiple transactions.

Select an optional owner when adding, editing, duplicating, or reviewing a bank
import, including inline/batch import completion. The transaction list displays the
owner. Choose **Unassigned** to clear an assignment. Existing transactions remain
unassigned, and changing an owner's name updates the displayed name on their transactions.

API: `GET/POST /api/transaction-owners`, `PUT /api/transaction-owners/:id`.
Owner bodies use `firstName`, `lastName`, `emailAddress`, and `phoneNumber`.
Transaction create/update and import completion accept `ownerId` (positive integer
or `null`). Omitting it on update preserves the existing assignment.

Existing databases must apply
`../SW365.Carina.Deployment/sql-updates/2026-10-22-add-transaction-owners.sql`
and then `sql/procedures.sql` before starting the matching app version. Do not rerun
`sql/schema.sql` against an existing database. See the deployment README for VM steps.
Fresh installations use `sql/schema.sql` followed by `sql/procedures.sql`.

Run API and UI regression tests with `node --test`. For the opt-in MySQL integration
test, set `$env:TRANSACTION_OWNER_DB_TEST = '1'` in PowerShell, then run
`node --test test\transaction-owners-db.test.js`. This uses the local MySQL server
at `127.0.0.1` with credentials/port from `.env`, creates a uniquely named temporary
database, tests the migration and procedures, then removes that database. The database
user needs permission to create and drop test databases; existing databases are not modified.

## Spending by owner report

Open **Reports → Spending by Owner & Expense Details** for a pie chart of each owner's
spending, followed by expense details grouped by owner, owner subtotals, and a grand total.
The current month loads automatically. Month and **Is Regular** filters apply to both
the chart and details. Hover over a slice for the amount and percentage.

Unassigned transactions form an **Unassigned** group. Owners with the same name remain
separate groups by ID. Only recorded expense transactions are included, using the same
rules as the daily expense report. Zero-value expenses remain in the table but do not
produce pie slices. Exact totals are available in the table even if the chart cannot load.

API: `GET /api/reports/owner-expenses?year=2026&month=10`, optionally with
`isRegular=true` or `isRegular=false`. The response contains `owners` (each with `owner_id`,
`owner_name`, `expenses`, and `total`) and `grand_total`.
No additional migration is needed after the transaction-owner migration.
Deploy the updated application with the existing application-update script.

Run checks with `node --test test/owner-expenses.test.js test/owner-spending.test.js`.
Set `TRANSACTION_OWNER_DB_TEST=1` to also run the isolated MySQL report integration
test using local `.env` credentials. It creates and removes a temporary database;
existing databases are not modified.

## Monthly expense report

Open **Reports → Daily Spending & Expense Details**, select a month, and choose **Generate report**. The current month loads automatically.
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

## Reports landing page and monthly analysis

**Reports** opens a landing page with links to **Monthly Expense Analysis** and
**Daily Spending & Expense Details**, plus **Spending by Owner & Expense Details**.
Each report includes an **All reports** link.

Monthly Expense Analysis compares all 12 months of the selected year using a
stacked category chart and a table with monthly totals and changes from the preceding
month. The Is Regular filter applies to the entire report. January has no comparison;
percentage changes are unavailable when the previous month has zero expenses.
Empty and future months show zero recorded spending, not forecasts. The table
includes all matching categories even when categories are hidden in the chart.

API: `GET /api/reports/monthly-analysis?year=2026`, optionally with
`isRegular=true` or `isRegular=false`. No database migration is needed.
See `../SW365.Carina.Deployment/REPORTS-LANDING-UPDATE.md` for deployment steps.

## Regular Payments

Open **Payments** to create manual weekly, fortnightly, monthly, quarterly or yearly
schedules. The monthly calendar and agenda show Upcoming, Overdue, Paid and Skipped
occurrences, with a next-seven-days list. Scheduled amounts never generate expenses.
To mark paid, complete any pending CSV import first and link the resulting expense
from the same account and category. Undo unlinks it without deleting the transaction.
To change a schedule, set its end date and create a replacement.

Existing installations must apply the additive payment-schedules migration before
updating the app. See `../SW365.Carina.Deployment/PAYMENTS-UPDATE.md` for the backup,
migration and application-update sequence. Existing Is Regular flags remain separate
from payment schedules. Run all checks with `node --test test/*.test.js`.

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
