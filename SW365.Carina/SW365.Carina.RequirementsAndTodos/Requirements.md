# Personal Finance Budget Web App Requirements

## 1) Goal

Convert the budget workbook into a simple multi-page web app so budget planning, expense tracking, and reporting can be managed through a browser using:

- Node.js + Express REST APIs (CommonJS)
- MySQL + mysql2 connection pool
- Stored procedures for business operations
- HTML + CSS + JavaScript + jQuery + Bootstrap 5 + Bootstrap Icons

## 2) Scope (MVP)

The MVP should support the core budgeting flow that is commonly represented in an annual budget workbook:

- Manage accounts/wallets (cash, bank, card)
- Manage budget categories (Housing, Food, Transport, etc.)
- Define monthly budget plan per category
- Add income and expense transactions
- View month summary: planned vs actual vs variance
- View annual overview across months

## 3) Functional Requirements

### FR-01 Accounts

- User can create, view, update, and deactivate accounts.
- Each transaction belongs to one account.
- Account type should distinguish everyday cash/card accounts from savings, investment, and loan accounts.

### FR-02 Categories

- User can create, view, update, and deactivate categories.
- Category has type: `INCOME` or `EXPENSE`.
- Transactions and budget plans reference categories.

### FR-03 Monthly Budget Planning

- User can set planned amount for each month and category.
- User can edit planned amounts later.
- System prevents duplicate plan rows for same `(year, month, category)`.

### FR-04 Transaction Entry

- User can add income/expense transactions with date, account, category, amount, note.
- User can edit and delete transactions.
- Amount must be positive and numeric.

### FR-05 Dashboard Summary

- User can select year and month.
- System returns:
  - Total planned amount
  - Total actual amount
  - Variance (`planned - actual` for expense categories)
  - Income total, expense total, net balance

### FR-06 Reports

- Monthly category report: planned vs actual per category.
- Annual trend report: total expenses per month.
- Account activity report: totals per account.

### FR-07 Validation and Error Feedback

- Client-side validation for required fields.
- Server-side validation is mandatory (never trust client).
- User-friendly messages shown in UI.

### FR-08 Non-Destructive Data Handling

- Prefer soft-delete (`is_active`) for accounts/categories.
- Deleting referenced data should be blocked with clear messages.

## 4) Non-Functional Requirements

- Use environment variables for configuration via `.env`.
- No hardcoded DB credentials.
- SQL injection prevention via stored procedure parameters.
- Consistent JSON response shape from API.
- ESLint + Prettier compliance.
- Responsive Bootstrap UI for desktop and mobile.

## 5) User Stories

### Budget Owner Stories

1. As a budget owner, I want to create accounts so I can track transactions by source.
2. As a budget owner, I want to manage categories so my budget is organized.
3. As a budget owner, I want to enter planned monthly values so I can set targets.
4. As a budget owner, I want to record daily transactions so actual values stay current.
5. As a budget owner, I want to edit incorrect transactions so reports remain accurate.
6. As a budget owner, I want to compare planned vs actual by month so I can control spending.
7. As a budget owner, I want to see annual totals so I can review long-term trends.
8. As a budget owner, I want meaningful validation errors so I can quickly fix input mistakes.
9. As a budget owner, I want to classify savings and investment accounts separately so I can understand where my money is held and separate everyday spending from long-term assets.

### Data Safety Stories

10. As a budget owner, I want protected delete behavior so historical data is not broken.
11. As a budget owner, I want backend validation so invalid or unsafe data cannot be saved.

## 6) Acceptance Criteria (MVP)

1. User can create at least one account and one category from UI.
2. User can create budget plans for multiple categories in a selected month.
3. User can create/update/delete transactions and changes appear after refresh.
4. Dashboard returns correct totals for selected month and year.
5. API returns proper status codes (`200`, `201`, `400`, `404`, `409`, `500`).
6. Stored procedures are used for create/update/get business operations.
7. Linting and formatting checks pass.
8. User can create and edit accounts using account types that include savings and investment accounts.

## 7) Assumptions

- The attached workbook is treated as an annual budget planner with monthly breakdown, category planning, and actual transactions.
- If the workbook contains additional sheets/columns, this document should be updated in iteration 2.

## 8) Workbook Mapping (Step 1)

### Why this section matters

Before building APIs and tables, we need a single source of truth for where each Excel field will live in the web app. This prevents duplicate columns, incorrect calculations, and API payload confusion.

### Mapping workflow

1. Pick one sheet from the workbook.
2. List every column exactly as shown in Excel.
3. Mark each column as input or calculated.
4. Decide the DB table and DB column.
5. Decide API request or response field.
6. Decide UI page and form/table element.
7. Add validation rule and business notes.

### Sheet Inventory

Fill this first after opening the workbook:

| Sheet Name | Purpose | Key Columns | Input or Calculated | Notes |
|---|---|---|---|---|
| Monthly Budget | Plan per month and category | Year, Month, Category, Planned Amount | Input | Example placeholder |
| Transactions | Actual income and expenses | Date, Account, Category, Amount, Note | Input | Example placeholder |
| Dashboard | Summary and variance view | Planned, Actual, Variance | Calculated | Example placeholder |

### Field Mapping Template

Use one row per workbook field.

| Workbook Sheet | Workbook Field | Data Type | Input or Calculated | DB Table | DB Column | API Endpoint | API Field | UI Page | Validation Rule | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Monthly Budget | Year | INT | Input | budget_plans | budget_year | /api/budgets | year | budgets.html | Required, between 2000 and 2100 | |
| Monthly Budget | Month | TINYINT | Input | budget_plans | budget_month | /api/budgets | month | budgets.html | Required, 1 to 12 | |
| Monthly Budget | Category | VARCHAR | Input | budget_plans | category_id | /api/budgets | categoryId | budgets.html | Required, must exist in categories | use foreign key |
| Monthly Budget | Planned Amount | DECIMAL(12,2) | Input | budget_plans | planned_amount | /api/budgets | plannedAmount | budgets.html | Required, positive number | |
| Transactions | Transaction Date | DATE | Input | transactions | txn_date | /api/transactions | txnDate | transactions.html | Required, valid date | |
| Transactions | Account | VARCHAR | Input | transactions | account_id | /api/transactions | accountId | transactions.html | Required, must exist in accounts | |
| Transactions | Category | VARCHAR | Input | transactions | category_id | /api/transactions | categoryId | transactions.html | Required, must exist in categories | |
| Transactions | Amount | DECIMAL(12,2) | Input | transactions | amount | /api/transactions | amount | transactions.html | Required, positive number | |
| Transactions | Note | VARCHAR | Input | transactions | note | /api/transactions | note | transactions.html | Optional, max length 255 | |
| Dashboard | Total Planned | DECIMAL(12,2) | Calculated | derived | derived | /api/reports/monthly-summary | totalPlanned | dashboard.html | Read only | computed in procedure |
| Dashboard | Total Actual | DECIMAL(12,2) | Calculated | derived | derived | /api/reports/monthly-summary | totalActual | dashboard.html | Read only | computed in procedure |
| Dashboard | Variance | DECIMAL(12,2) | Calculated | derived | derived | /api/reports/monthly-summary | variance | dashboard.html | Read only | planned minus actual |

### Formula Mapping Template

Use this to convert Excel formulas into SQL logic or stored procedure logic.

| Workbook Sheet | Excel Formula Meaning | SQL or Procedure Logic | Endpoint Using It | Verified (Y/N) | Notes |
|---|---|---|---|---|---|
| Dashboard | Sum planned for month | SUM(planned_amount) by year and month | /api/reports/monthly-summary | N | |
| Dashboard | Sum actual for month | SUM(amount) by year and month | /api/reports/monthly-summary | N | |
| Dashboard | Variance | planned total minus actual total | /api/reports/monthly-summary | N | |

### Gap and Risk Log

Record uncertain or missing workbook details here before coding:

| Item | Risk | Proposed Handling | Owner | Status |
|---|---|---|---|---|
| Unknown sheet columns | Wrong DB design | Confirm workbook columns before schema freeze | Product/Dev | Open |
| Ambiguous variance formula | Incorrect reporting | Validate formula with one sample month | Dev | Open |
| Account type taxonomy | Savings and investments are forced into vague account categories | Add explicit account types such as `SAVINGS`, `TRANSACTION_ACCOUNT`, `INVESTMENT`, and `LOAN` | Product/Dev | Open |
