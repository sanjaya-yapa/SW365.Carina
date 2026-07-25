-- Personal Finance schema (MySQL 8+)
-- Run this file in MySQL Workbench or mysql CLI.

CREATE DATABASE IF NOT EXISTS personal_finance
	CHARACTER SET utf8mb4
	COLLATE utf8mb4_unicode_ci;

USE personal_finance;

-- Drop child tables first for safe re-runs.
DROP TABLE IF EXISTS bank_transaction_imports;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS budget_plans;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS months;

CREATE TABLE months (
	month_no TINYINT UNSIGNED NOT NULL,
	month_name VARCHAR(20) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (month_no),
	UNIQUE KEY uq_months_name (month_name),
	CONSTRAINT chk_months_no CHECK (month_no BETWEEN 1 AND 12)
);

INSERT INTO months (month_no, month_name)
VALUES
	(1, 'January'),
	(2, 'February'),
	(3, 'March'),
	(4, 'April'),
	(5, 'May'),
	(6, 'June'),
	(7, 'July'),
	(8, 'August'),
	(9, 'September'),
	(10, 'October'),
	(11, 'November'),
	(12, 'December');

CREATE TABLE accounts (
	account_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	account_name VARCHAR(100) NOT NULL,
	account_type ENUM('CASH', 'SAVINGS', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT') NOT NULL DEFAULT 'CASH',
	opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
	is_active TINYINT(1) NOT NULL DEFAULT 1,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (account_id),
	UNIQUE KEY uq_accounts_name (account_name)
);

CREATE TABLE categories (
	category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	category_name VARCHAR(100) NOT NULL,
	category_type ENUM('INCOME', 'EXPENSE') NOT NULL,
	is_active TINYINT(1) NOT NULL DEFAULT 1,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (category_id),
	UNIQUE KEY uq_categories_name_type (category_name, category_type)
);

CREATE TABLE budget_plans (
	plan_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	budget_year SMALLINT UNSIGNED NOT NULL,
	budget_month TINYINT UNSIGNED NOT NULL,
	category_id BIGINT UNSIGNED NOT NULL,
	planned_amount DECIMAL(12, 2) NOT NULL,
	note VARCHAR(255) NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (plan_id),
	UNIQUE KEY uq_budget_plan_year_month_category (budget_year, budget_month, category_id),
	KEY idx_budget_plans_year_month (budget_year, budget_month),
	CONSTRAINT chk_budget_year CHECK (budget_year BETWEEN 2000 AND 2100),
	CONSTRAINT chk_budget_planned_amount CHECK (planned_amount >= 0),
	CONSTRAINT fk_budget_plans_month
		FOREIGN KEY (budget_month) REFERENCES months (month_no)
		ON UPDATE CASCADE
		ON DELETE RESTRICT,
	CONSTRAINT fk_budget_plans_category
		FOREIGN KEY (category_id) REFERENCES categories (category_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
);

CREATE TABLE transactions (
	transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	txn_date DATE NOT NULL,
	account_id BIGINT UNSIGNED NOT NULL,
	category_id BIGINT UNSIGNED NOT NULL,
	amount DECIMAL(12, 2) NOT NULL,
	is_tax_claimable BOOLEAN NOT NULL DEFAULT FALSE,
	note VARCHAR(255) NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (transaction_id),
	KEY idx_transactions_txn_date (txn_date),
	KEY idx_transactions_category_id (category_id),
	KEY idx_transactions_account_id (account_id),
	KEY idx_transactions_date_category (txn_date, category_id),
	KEY idx_transactions_date_account (txn_date, account_id),
	CONSTRAINT chk_transactions_amount CHECK (amount > 0),
	CONSTRAINT fk_transactions_account
		FOREIGN KEY (account_id) REFERENCES accounts (account_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT,
	CONSTRAINT chk_transactions_is_tax_claimable
    	CHECK (is_tax_claimable IN (0, 1)),
	CONSTRAINT fk_transactions_category
		FOREIGN KEY (category_id) REFERENCES categories (category_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
);

CREATE TABLE bank_transaction_imports (
	import_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	import_hash CHAR(64) NOT NULL,
	txn_date DATE NOT NULL,
	signed_amount DECIMAL(12, 2) NOT NULL,
	amount DECIMAL(12, 2) NOT NULL,
	description VARCHAR(255) NOT NULL,
	account_id BIGINT UNSIGNED NULL,
	category_id BIGINT UNSIGNED NULL,
	is_tax_claimable BOOLEAN NOT NULL DEFAULT FALSE,
	status ENUM('PENDING', 'IMPORTED') NOT NULL DEFAULT 'PENDING',
	transaction_id BIGINT UNSIGNED NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (import_id),
	UNIQUE KEY uq_bank_transaction_imports_hash (import_hash),
	KEY idx_bank_transaction_imports_date_status (txn_date, status),
	KEY idx_bank_transaction_imports_account_id (account_id),
	KEY idx_bank_transaction_imports_category_id (category_id),
	KEY idx_bank_transaction_imports_transaction_id (transaction_id),
	CONSTRAINT chk_bank_transaction_imports_signed_amount CHECK (signed_amount <> 0),
	CONSTRAINT chk_bank_transaction_imports_amount CHECK (amount > 0),
	CONSTRAINT fk_bank_transaction_imports_account
		FOREIGN KEY (account_id) REFERENCES accounts (account_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_bank_transaction_imports_category
		FOREIGN KEY (category_id) REFERENCES categories (category_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_bank_transaction_imports_transaction
		FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
);
