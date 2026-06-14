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
- [x] Add controller methods with flow:
  - [x] Accounts controller flow:
    - [x] `GET /api/accounts`: validate query -> call `sp_get_accounts` -> `sendSuccess(200)`
    - [x] `POST /api/accounts`: validate body -> call `sp_add_account` -> `sendSuccess(201)`
    - [x] `PUT /api/accounts/:id`: validate params/body -> call `sp_update_account` -> `sendSuccess(200)`
    - [x] `PATCH /api/accounts/:id/deactivate`: validate params -> call `sp_deactivate_account` -> `sendSuccess(200)`
  - [x] Categories controller flow:
    - [x] `GET /api/categories`: validate query -> call `sp_get_categories` -> `sendSuccess(200)`
    - [x] `POST /api/categories`: validate body -> call `sp_add_category` -> `sendSuccess(201)`
    - [x] `PUT /api/categories/:id`: validate params/body -> call `sp_update_category` -> `sendSuccess(200)`
    - [x] `PATCH /api/categories/:id/deactivate`: validate params -> call `sp_deactivate_category` -> `sendSuccess(200)`
  - [x] Budgets controller flow:
    - [x] `GET /api/budgets?year=&month=`: validate query -> call `sp_get_budget_plan_by_month` -> `sendSuccess(200)`
    - [x] `POST /api/budgets/upsert`: validate body -> call `sp_upsert_budget_plan` -> `sendSuccess(200 or 201)`
  - [x] Transactions controller flow:
    - [x] `GET /api/transactions`: validate filters -> call `sp_get_transactions` -> `sendSuccess(200)`
    - [x] `POST /api/transactions`: validate body -> call `sp_add_transaction` -> `sendSuccess(201)`
    - [x] `PUT /api/transactions/:id`: validate params/body -> call `sp_update_transaction` -> `sendSuccess(200)`
    - [x] `DELETE /api/transactions/:id`: validate params -> call `sp_delete_transaction` -> `sendSuccess(200)`
  - [x] Reports controller flow:
    - [x] `GET /api/reports/monthly-summary`: validate query -> call `sp_get_monthly_summary` -> `sendSuccess(200)`
    - [x] `GET /api/reports/monthly-category-variance`: validate query -> call `sp_get_monthly_category_variance` -> `sendSuccess(200)`
    - [x] `GET /api/reports/annual-expense-trend`: validate query -> call `sp_get_annual_expense_trend` -> `sendSuccess(200)`
  - [x] Error mapping in controllers/services:
    - [x] validation failures -> `400`
    - [x] missing records -> `404`
    - [x] duplicate/conflict/reference block -> `409`
    - [x] unhandled server errors -> `500` with safe message
- [x] Add validation middleware for required fields and numeric/date checks.
- [x] Use proper HTTP status codes and avoid leaking stack traces.

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

1. [x] Accounts + Categories API ✅ (Backend complete)
2. [x] Budget Plans API ✅ (Backend complete)
3. [x] Transactions API ✅ (Backend complete)
4. [x] Reports API ✅ (Backend complete)
5. [ ] Frontend UI Integration - START HERE:
   - [ ] Accounts UI (list, add, edit, deactivate)
   - [ ] Categories UI (list, add, edit, deactivate)
   - [ ] Budgets UI (year/month selector, editable table, save)
   - [ ] Transactions UI (form, list, filters, edit, delete)
   - [ ] Dashboard UI (summary cards, variance table)
   - [ ] Reports UI (annual trend, category variance)

## User Story Implementation Steps (Requirements.md)

### US-01: Create accounts

- [x] Backend:
  - [x] Route handlers in `src/routes/accounts.routes.js`.
  - [x] Controller methods in `src/controllers/accounts.controller.js`.
  - [x] Service procedure calls in `src/services/accounts.service.js`.
  - [x] Validate `name`, `accountType`, `openingBalance`, and `:id` where applicable.
- [ ] Frontend:
  - [ ] Build list + add form on `public/pages/accounts.html`.
  - [ ] Add `public/js/accounts.js` with fetch + DOM rendering.
  - [ ] Show result using `window.showMessage()`.
- [ ] Test:
  - [ ] Add account (valid), add account (invalid), edit, deactivate.

### US-02: Manage categories

- [x] Backend:
  - [x] Route handlers in `src/routes/categories.routes.js`.
  - [x] Controller methods in `src/controllers/categories.controller.js`.
  - [x] Service procedure calls in `src/services/categories.service.js`.
  - [x] Validate `name`, `categoryType` (`INCOME|EXPENSE`), and `:id`.
- [ ] Frontend:
  - [ ] Build list + add/edit/deactivate UI on `public/pages/categories.html`.
  - [ ] Add `public/js/categories.js` with API integration.
  - [ ] Show validation and API errors via `window.showMessage()`.
- [ ] Test:
  - [ ] Verify category type rules and deactivate protection behavior.

### US-03: Enter monthly planned values

- [x] Backend:
  - [x] Route handlers in `src/routes/budgets.routes.js`.
  - [x] Controller methods in `src/controllers/budgets.controller.js`.
  - [x] Service calls to `sp_get_budget_plan_by_month` and `sp_upsert_budget_plan`.
  - [x] Validate `year`, `month`, `categoryId`, `plannedAmount`.
- [ ] Frontend:
  - [ ] Build year/month filter and editable budget table in `public/pages/budgets.html`.
  - [ ] Add save flow with upsert behavior.
  - [ ] Highlight updated row status and show success/failure message.
- [ ] Test:
  - [ ] Save plan, update same plan, and confirm duplicate prevention.

### US-04: Record daily transactions

- [x] Backend:
  - [x] Route handlers in `src/routes/transactions.routes.js`.
  - [x] Controller methods in `src/controllers/transactions.controller.js`.
  - [x] Service calls to `sp_add_transaction` and `sp_get_transactions`.
  - [x] Validate `txnDate`, `accountId`, `categoryId`, `amount`, `note`.
- [ ] Frontend:
  - [ ] Build transaction entry form and list on `public/pages/transactions.html`.
  - [ ] Load account/category options from APIs.
  - [ ] Implement month/category/account filters.
- [ ] Test:
  - [ ] Add income and expense records; verify filter behavior.

### US-05: Edit incorrect transactions

- [x] Backend:
  - [x] Implement `PUT /api/transactions/:id` and `DELETE /api/transactions/:id`.
  - [x] Map not-found and conflict errors to proper status codes.
- [ ] Frontend:
  - [ ] Add edit mode and delete action for each transaction row.
  - [ ] Preserve temporary edit state in `sessionStorage` if needed.
- [ ] Test:
  - [ ] Edit then refresh; delete then refresh; verify DB state.

### US-06: Compare planned vs actual by month

- [x] Backend:
  - [x] Add report route/controller/service for monthly summary.
  - [x] Call `sp_get_monthly_summary` and map response fields clearly.
- [ ] Frontend:
  - [ ] Add year/month selectors on `public/pages/dashboard.html`.
  - [ ] Render cards: planned, actual, variance, income, expense, net.
  - [ ] Render planned-vs-actual table by category.
- [ ] Test:
  - [ ] Validate summary values against sample workbook month.

### US-07: Review annual totals/trends

- [x] Backend:
  - [x] Add report endpoints for annual trend and category variance.
  - [x] Call `sp_get_annual_expense_trend` and `sp_get_monthly_category_variance`.
- [ ] Frontend:
  - [ ] Build reports table views on `public/pages/reports.html`.
  - [ ] Return chart-ready JSON shape for future visualization.
- [ ] Test:
  - [ ] Validate annual totals for at least one full year.

### US-08: Show meaningful validation errors

- [ ] Backend:
  - [ ] Extend `src/middleware/validate-request.js` with reusable validators.
  - [ ] Return field-level error details in standardized error responses.
- [ ] Frontend:
  - [ ] Render API validation messages next to forms and global area.
  - [ ] Keep user input in form after validation failure.
- [ ] Test:
  - [ ] Empty required fields, invalid month/date, negative amounts, long notes.

### US-09: Protected delete behavior

- [ ] Backend:
  - [ ] Keep soft-delete for accounts/categories.
  - [ ] Block unsafe deletes/deactivations when references exist.
  - [ ] Convert DB `SIGNAL SQLSTATE` to user-safe conflict messages.
- [ ] Frontend:
  - [ ] Ask for confirmation before deactivation/delete actions.
  - [ ] Show clear reason when operation is blocked.
- [ ] Test:
  - [ ] Attempt deactivate/delete for referenced and non-referenced data.

### US-10: Strong backend validation

- [ ] Backend:
  - [ ] Validate all write endpoints server-side (do not trust client).
  - [ ] Enforce decimal precision, date range, and enum constraints.
  - [ ] Sanitize and trim string inputs before DB calls.
- [ ] Quality:
  - [ ] Add shared helpers to reduce duplicated validation logic.
  - [ ] Ensure all DB access remains through stored procedures/parameters.
- [ ] Test:
  - [ ] Try malformed JSON, wrong types, and boundary values.

### Story-by-Story Completion Gate (Apply To Every User Story)

- [ ] API endpoint implemented and reachable.
- [ ] Controller flow completed: validate -> service/procedure -> standardized response.
- [ ] Manual happy-path test passed.
- [ ] Manual error-path test passed.
- [ ] Add one entry to learning notes (request, procedure, errors).
