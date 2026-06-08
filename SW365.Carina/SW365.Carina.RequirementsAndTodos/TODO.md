# TODO - Personal Finance Budget Web App

Status Legend:
- [x] Completed
- [~] In progress / partially completed
- [ ] Not started

## Phase 0: Understand Workbook and Finalize Data Mapping

- [~] Open the workbook and list all sheets.
- [~] For each sheet, document columns, formulas, and derived values.
- [~] Mark which values are input fields vs calculated fields.
- [x] Create a mapping table: `Workbook Field -> Database Column -> API Field -> UI Field`.
- [~] Confirm business rules (e.g., variance formula, month format, category type).

## Phase 1: Project Infrastructure Setup

- [x] Initialize Node project.
- [x] Install runtime dependencies.
- [x] Install dev dependencies.
- [x] Create base structure (`src`, `public`, `sql`, modular folders).
- [x] Add scripts to `package.json` (`start`, `dev`, `lint`, `format`, `format:check`).
- [x] Create `.env` and `.env.example`.
- [x] Add `.gitignore` entries for `node_modules`, `.env`, logs.

## Phase 2: Code Quality and Conventions

- [x] Configure ESLint for Node + browser JS (CommonJS style).
- [x] Configure Prettier and ignore files.
- [x] Add a short `README.md` with run/setup commands.
- [x] Define API response standard:
  - [x] Success shape introduced in starter routes.
  - [x] Error shape standardized in shared response helper and app-level handlers.

## Phase 3: Database Design (MySQL)

- [x] Create database (`personal_finance`).
- [x] Create tables:
  - [x] `accounts`
  - [x] `categories`
  - [x] `budget_plans`
  - [x] `transactions`
  - [x] `months`
- [x] Add keys and constraints:
  - [x] Primary keys on all tables
  - [x] Foreign keys from `transactions` and `budget_plans`
  - [x] Unique constraint for plan `(year, month, category_id)`
- [x] Add indexing for filtering/report performance.

## Phase 4: Stored Procedures (Core Business Layer)

- [x] Accounts procedures:
  - [x] `sp_add_account`
  - [x] `sp_get_accounts`
  - [x] `sp_update_account`
  - [x] `sp_deactivate_account`
- [x] Categories procedures:
  - [x] `sp_add_category`
  - [x] `sp_get_categories`
  - [x] `sp_update_category`
  - [x] `sp_deactivate_category`
- [x] Budget plan procedures:
  - [x] `sp_upsert_budget_plan`
  - [x] `sp_get_budget_plan_by_month`
- [x] Transaction procedures:
  - [x] `sp_add_transaction`
  - [x] `sp_get_transactions`
  - [x] `sp_update_transaction`
  - [x] `sp_delete_transaction`
- [x] Report procedures:
  - [x] `sp_get_monthly_summary`
  - [x] `sp_get_monthly_category_variance`
  - [x] `sp_get_annual_expense_trend`
- [x] Include `SIGNAL SQLSTATE` messages for predictable validation failures.

## Phase 5: Backend API (Express + CommonJS)

- [x] Setup Express app with middleware:
  - [x] `express.json()`
  - [x] static serving for `public`
  - [x] centralized error handler (starter)
- [x] Implement MySQL pool module in `src/config/db.js`.
- [x] Build modular routes:
  - [x] `/api/accounts`
  - [x] `/api/categories`
  - [x] `/api/budgets`
  - [x] `/api/transactions`
  - [x] `/api/reports`
- [ ] Add controller methods with flow:
  - [ ] validate request
  - [ ] call stored procedure
  - [ ] return standardized response
- [~] Add validation middleware for required fields and numeric/date checks.
- [~] Use proper HTTP status codes and avoid leaking stack traces.

## Phase 6: Frontend Pages (Multi-Page + Bootstrap + jQuery)

- [~] Build shared layout and navbar.
- [x] Create pages:
  - [x] `public/pages/dashboard.html`
  - [x] `public/pages/accounts.html`
  - [x] `public/pages/categories.html`
  - [x] `public/pages/budgets.html`
  - [x] `public/pages/transactions.html`
  - [x] `public/pages/reports.html`
- [~] Add shared JS utility modules:
  - [ ] API helper (`fetch` + JSON parsing)
  - [x] message helper (`window.showMessage()`)
  - [ ] formatting helper (currency/date)
- [~] Use Bootstrap components (starter usage exists, full usage pending).
- [~] Use Bootstrap Icons for actions (starter usage exists, full usage pending).
- [~] Use jQuery for DOM updates and event delegation where helpful.

## Phase 7: Page-by-Page Feature Tasks

- [ ] Accounts page:
  - [ ] list, add, edit, deactivate account
- [ ] Categories page:
  - [ ] list, add, edit, deactivate category
- [ ] Budgets page:
  - [ ] select year/month
  - [ ] edit per-category planned amounts
  - [ ] save via upsert API
- [ ] Transactions page:
  - [ ] create/edit/delete transaction
  - [ ] filter by month/category/account
- [ ] Dashboard page:
  - [ ] show cards for income, expense, net, variance
  - [ ] show planned vs actual table
- [ ] Reports page:
  - [ ] annual trend table/chart-ready JSON
  - [ ] category variance table

## Phase 8: Validation, Security, and Error Handling

- [~] Add strict server-side validation for all write endpoints.
- [x] Ensure all DB calls are parameterized/stored-procedure based (designed in SQL layer).
- [~] Block unsafe deletes when referenced by transactions.
- [~] Return safe error messages to frontend.
- [ ] Validate amount precision and date range in API layer.

## Phase 9: Testing and Verification

- [ ] Manual API testing (Postman/Thunder Client) for all endpoints.
- [ ] Manual UI testing for each page flow.
- [ ] Verify computed values against workbook sample month.
- [ ] Confirm no duplicate budget plans per month/category.
- [ ] Run:
  - [ ] `npm run lint`
  - [ ] `npm run format:check`
  - [ ] `npm run dev`

## Phase 10: Learning Checkpoints (Do Not Skip)

- [ ] After each API, write a short note:
  - [ ] request format
  - [ ] stored procedure used
  - [ ] possible errors
- [ ] After each page, document event flow:
  - [ ] user action -> API call -> DOM update -> message
- [ ] Keep a `LEARNINGS.md` journal with 3 items per phase:
  - [ ] what worked
  - [ ] what was confusing
  - [ ] what to improve next

## Suggested Build Order (Current Focus)

1. [ ] Accounts + Categories full API + UI integration
2. [ ] Budget Plans API + UI
3. [ ] Transactions API + UI
4. [ ] Dashboard summary integration
5. [ ] Reports integration
6. [ ] Hardening + polish + testing
