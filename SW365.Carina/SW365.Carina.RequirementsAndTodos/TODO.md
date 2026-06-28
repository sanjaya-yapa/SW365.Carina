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

- [x] Accounts page:
  - [x] list, add, edit, deactivate account
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

## Phase 11: Containerization and Azure Deployment (Minimum Cost / Free Tier)

**Cost Strategy:** Use Azure free tier services + low-cost alternatives where possible.

- [ ] **Docker setup:**
  - [ ] Create `Dockerfile` for Node.js app with multi-stage build (optimized for small image size).
  - [ ] Create `.dockerignore` file (exclude `node_modules`, `.git`, logs, `.env`).
  - [ ] Test Docker build locally: `docker build -t personal-finance:latest .`
  - [ ] Test Docker run locally: `docker run -p 3000:3000 --env-file .env personal-finance:latest`
  - [ ] Verify app is accessible on `localhost:3000` inside container.

- [ ] **Azure setup (free tier focused):**
  - [ ] Create free Azure account (if not already done) - includes $200 free credits for 30 days.
  - [ ] Create Azure resource group (e.g., `personal-finance-rg`).
  - [ ] **Option A (LOWEST COST - Recommended):** Azure Container Instances (ACI) + GitHub Container Registry
    - [ ] Use free GitHub Container Registry (ghcr.io) instead of Azure Container Registry (saves $50-100/month).
    - [ ] Tag image: `docker tag personal-finance:latest ghcr.io/your-username/personal-finance:latest`
    - [ ] Push to GitHub Container Registry: `docker push ghcr.io/your-username/personal-finance:latest`
    - [ ] Deploy to ACI: Create container instance from GitHub Container Registry image (~$10-30/month based on compute time).
    - [ ] Configure environment variables (`.env` values) in ACI.
    - [ ] Expose port 3000.
    - [ ] Note: ACI charges per second of execution (e.g., 1 CPU + 1.5GB RAM = ~$0.015/hour).
  - [ ] **Option B (COMPLETELY FREE):** Azure App Service on Free Tier (F1)
    - [ ] Limitation: 1 GB RAM, 1 vCPU shared, 60 CPU min/day limit, no scaling.
    - [ ] Create App Service Plan on **Free tier (F1)**.
    - [ ] Create Web App from Docker Container (use GitHub Container Registry).
    - [ ] Configure application settings (environment variables).
    - [ ] Test at `https://<app-name>.azurewebsites.net` (App Service provides free HTTPS).
    - [ ] ⚠️ **Warning:** Free tier may be slow for simultaneous users; suitable for demo/learning only.
  - [ ] **Option C (HYBRID - Balanced cost):** Azure Container Instances + keep existing MySQL
    - [ ] Deploy app container to ACI on Basic tier (B0 = ~$7-15/month).
    - [ ] Keep MySQL on existing server (or use free tier MySQL elsewhere).
    - [ ] Estimated monthly cost: $15-30 total.

- [ ] **Database (cost optimization):**
  - [ ] **Option 1 (CHEAPEST):** Keep existing MySQL server (no additional cost).
  - [ ] **Option 2 (FREE trial):** Azure Database for MySQL - Single Server has limited free tier (~12 months for new accounts, then B1 plan ~$25-50/month).
  - [ ] **Option 3 (BUDGET):** AWS RDS free tier (similar structure: 12 months free, then pay).
  - [ ] Recommendation: Keep existing MySQL unless requiring managed backup/HA.

- [ ] **Environment and secrets management (free):**
  - [ ] Add `.env` to `.gitignore` (already done).
  - [ ] Use GitHub Secrets for CI/CD pipeline (free for public repos, included in free GitHub account).
  - [ ] For container secrets: Pass via App Service Application Settings or ACI Environment Variables (free).
  - [ ] ⚠️ Do NOT commit `.env` to GitHub.

- [ ] **CI/CD Pipeline with GitHub Actions (FREE):**
  - [ ] GitHub Actions is **free for public repos** (unlimited minutes).
  - [ ] Create `.github/workflows/deploy.yml` with steps:
    - [ ] Checkout code
    - [ ] Build Docker image
    - [ ] Login to GitHub Container Registry (using `GITHUB_TOKEN`).
    - [ ] Push to GitHub Container Registry.
    - [ ] Deploy to Azure (ACI or App Service via Azure CLI).
  - [ ] Trigger on: push to `main` branch.
  - [ ] Note: Even if repo is private, GitHub Actions has 2000 free minutes/month per account.

- [ ] **Azure CLI setup (free):**
  - [ ] Install Azure CLI: `az --version`.
  - [ ] Login: `az login`.
  - [ ] Keep Azure CLI commands in deployment scripts (cheaper than manual Azure Portal operations).

- [ ] **Health checks and monitoring (free tier):**
  - [ ] Add health check endpoint: `GET /health` returns `{ status: 'ok' }`.
  - [ ] Use free Application Insights tier (1 GB/month free, then $0.50/GB) for logs.
  - [ ] Or use **free Log Analytics** workspace (5 GB/month free).
  - [ ] Configure ACI or App Service health probe to monitor `/health`.
  - [ ] Set up email alerts (free) for errors.

- [ ] **Domain (optional, free options):**
  - [ ] Use default Azure domain: `<app-name>.azurewebsites.net` (free).
  - [ ] Or use free `.tk`, `.ml` domains from Freenom (not recommended for production).
  - [ ] Or point subdomain using free DNS (Cloudflare, Route53).

- [ ] **Documentation (free):**
  - [ ] Create `DEPLOYMENT.md` with:
    - [ ] Prerequisites (Azure CLI, Docker, free tier sign-up).
    - [ ] Step-by-step deployment to ACI or App Service (free tier).
    - [ ] Environment variables reference.
    - [ ] **Cost breakdown** (e.g., "ACI: ~$20/month", "App Service F1: $0").
    - [ ] Troubleshooting guide.
  - [ ] Document scaling limits and when to upgrade.

- [ ] **Testing in production (free):**
  - [ ] Verify all API endpoints are reachable.
  - [ ] Test CRUD operations (create account, add transaction, etc.).
  - [ ] Verify error handling (404, 409, 400, 500 responses).
  - [ ] Check that frontend loads and communicates with API.
  - [ ] Monitor logs using free tier tools (Application Insights or Log Analytics).

- [ ] **Cost summary (monthly estimate):**
  - [ ] GitHub Container Registry: $0 (free).
  - [ ] GitHub Actions: $0 (free for public repo).
  - [ ] **Azure App Service F1 (free tier):** $0 (limited performance).
  - [ ] **OR Azure Container Instances (B0):** $7-15 (better performance).
  - [ ] Application Insights (1GB free): $0.
  - [ ] Existing MySQL: $0 (reuse current server).
  - [ ] **Total (minimum cost):** $0-15/month (vs. $100+ for production-grade services).

## Suggested Build Order (Current Focus)

1. [x] Accounts + Categories API ✅ (Backend complete)
2. [x] Budget Plans API ✅ (Backend complete)
3. [x] Transactions API ✅ (Backend complete)
4. [x] Reports API ✅ (Backend complete)
5. [ ] Frontend UI Integration - IN PROGRESS:
   - [x] Accounts UI (list, add, edit, deactivate)
   - [x] Categories UI (list, add, edit, deactivate)
   - [x] Budgets UI (year/month selector, editable table, save)
   - [x] Transactions UI (form, list, filters, edit, delete)
   - [ ] Dashboard UI (summary cards, variance table)
   - [ ] Reports UI (annual trend, category variance)
6. [ ] Phase 11: Containerization and Azure Deployment - FUTURE:
   - [ ] Docker setup (Dockerfile, build, test locally)
   - [ ] Azure Container Registry (create, push image)
   - [ ] Azure deployment (App Service or ACI)
   - [ ] Environment/secrets management
   - [ ] MySQL connectivity in production
   - [ ] CI/CD pipeline (GitHub Actions)
   - [ ] Health checks and monitoring
   - [ ] Documentation and testing in production

## User Story Implementation Steps (Requirements.md)

### US-01: Create accounts

- [x] Backend:
  - [x] Route handlers in `src/routes/accounts.routes.js`.
  - [x] Controller methods in `src/controllers/accounts.controller.js`.
  - [x] Service procedure calls in `src/services/accounts.service.js`.
  - [x] Validate `name`, `accountType`, `openingBalance`, and `:id` where applicable.
- [x] Frontend:
  - [x] Build list on `public/pages/accounts.html` (cards grid layout).
  - [x] Create standalone add page `public/pages/add-account.html` (mobile-friendly, no modals).
  - [x] Add `public/js/add-account.js` with form submission and redirect.
  - [x] Show result using `window.showMessage()`.
- [x] Test:
  - [x] Add account (valid), add account (invalid), verify mobile layout, edit, deactivate.

### US-02: Manage categories

- [x] Backend:
  - [x] Route handlers in `src/routes/categories.routes.js`.
  - [x] Controller methods in `src/controllers/categories.controller.js`.
  - [x] Service procedure calls in `src/services/categories.service.js`.
  - [x] Validate `name`, `categoryType` (`INCOME|EXPENSE`), and `:id`.
- [x] Frontend:
  - [x] Build list + add/edit/deactivate UI on `public/pages/categories.html`.
  - [x] Add `public/js/categories.js` with API integration.
  - [x] Show validation and API errors via `window.showMessage()`.
- [x] Test:
  - [x] Verify category type rules and deactivate protection behavior.

### US-03: Enter monthly planned values

- [x] Backend:
  - [x] Route handlers in `src/routes/budgets.routes.js`.
  - [x] Controller methods in `src/controllers/budgets.controller.js`.
  - [x] Service calls to `sp_get_budget_plan_by_month` and `sp_upsert_budget_plan`.
  - [x] Validate `year`, `month`, `categoryId`, `plannedAmount`.
- [x] Frontend:
  - [x] Build year/month filter and editable budget table in `public/pages/budgets.html`.
  - [x] Add save flow with upsert behavior.
  - [x] Highlight updated row status and show success/failure message.
- [x] Test:
  - [x] Save plan, update same plan, and confirm duplicate prevention.

### US-04: Record daily transactions

- [x] Backend:
  - [x] Route handlers in `src/routes/transactions.routes.js`.
  - [x] Controller methods in `src/controllers/transactions.controller.js`.
  - [x] Service calls to `sp_add_transaction` and `sp_get_transactions`.
  - [x] Validate `txnDate`, `accountId`, `categoryId`, `amount`, `note`.
- [x] Frontend:
  - [x] Build transaction entry form and list on `public/pages/transactions.html`.
  - [x] Load account/category options from APIs.
  - [x] Implement month/category/account filters.
- [x] Test:
  - [x] Add income and expense records; verify filter behavior.

### US-05: Edit incorrect transactions

- [x] Backend:
  - [x] Implement `PUT /api/transactions/:id` and `DELETE /api/transactions/:id`.
  - [x] Map not-found and conflict errors to proper status codes.
- [x] Frontend:
  - [x] Add edit mode and delete action for each transaction row.
  - [x] Preserve temporary edit state in `sessionStorage` if needed.
  - [x] Duplicate transactions for next month when editing date to different month (optional advanced).
- [x] Test:
  - [x] Edit then refresh; delete then refresh; verify DB state.

### US-06: Compare planned vs actual by month

- [x] Backend:
  - [x] Add report route/controller/service for monthly summary.
  - [x] Call `sp_get_monthly_summary` and map response fields clearly.
- [x] Frontend:
  - [x] Add year/month selectors on `public/pages/dashboard.html`.
  - [x] Render cards: planned, actual, variance, income, expense, net.
  - [x] Render planned-vs-actual table by category.
- [x] Test:
  - [x] Validate summary values against sample workbook month.

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

### US-11: Identify tax-claimable expenses

- [x] Database:
  - [x] Add `transactions.is_tax_claimable` with a default value of `FALSE`.
  - [x] Update transaction create, read, and update stored procedures.
- [x] Backend:
  - [x] Accept and validate `isTaxClaimable` on transaction write endpoints.
  - [x] Reject tax-claimable income transactions.
  - [x] Return `is_tax_claimable` from transaction read operations.
- [x] Frontend:
  - [x] Add the tax-claimable checkbox to create and edit forms.
  - [x] Disable and clear the checkbox when an income category is selected.
  - [x] Display tax-claimable status in the transaction list.
  - [x] Preserve tax-claimable status when duplicating a transaction.
- [ ] Test:
  - [ ] Create, edit, list, and duplicate a tax-claimable expense.
  - [x] Verify income and existing transactions default to non-claimable.
  - [x] Verify the API rejects a tax-claimable income transaction.

### Story-by-Story Completion Gate (Apply To Every User Story)

- [ ] API endpoint implemented and reachable.
- [ ] Controller flow completed: validate -> service/procedure -> standardized response.
- [ ] Manual happy-path test passed.
- [ ] Manual error-path test passed.
- [ ] Add one entry to learning notes (request, procedure, errors).
