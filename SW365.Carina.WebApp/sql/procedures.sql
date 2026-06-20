USE personal_finance;

DROP PROCEDURE IF EXISTS sp_add_account;
DROP PROCEDURE IF EXISTS sp_get_accounts;
DROP PROCEDURE IF EXISTS sp_update_account;
DROP PROCEDURE IF EXISTS sp_deactivate_account;

DROP PROCEDURE IF EXISTS sp_add_category;
DROP PROCEDURE IF EXISTS sp_get_categories;
DROP PROCEDURE IF EXISTS sp_update_category;
DROP PROCEDURE IF EXISTS sp_deactivate_category;

DROP PROCEDURE IF EXISTS sp_upsert_budget_plan;
DROP PROCEDURE IF EXISTS sp_get_budget_plan_by_month;

DROP PROCEDURE IF EXISTS sp_add_transaction;
DROP PROCEDURE IF EXISTS sp_get_transactions;
DROP PROCEDURE IF EXISTS sp_update_transaction;
DROP PROCEDURE IF EXISTS sp_delete_transaction;

DROP PROCEDURE IF EXISTS sp_get_monthly_summary;
DROP PROCEDURE IF EXISTS sp_get_monthly_category_variance;
DROP PROCEDURE IF EXISTS sp_get_annual_expense_trend;

DELIMITER $$

CREATE PROCEDURE sp_add_account(
	IN p_account_name VARCHAR(100),
	IN p_account_type VARCHAR(20),
	IN p_opening_balance DECIMAL(12, 2)
)
BEGIN
	IF p_account_name IS NULL OR TRIM(p_account_name) = '' THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account name is required';
	END IF;

	IF p_opening_balance < 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening balance cannot be negative';
	END IF;

	IF p_account_type NOT IN ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT') THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid account type';
	END IF;

	INSERT INTO accounts (account_name, account_type, opening_balance)
	VALUES (TRIM(p_account_name), p_account_type, p_opening_balance);

	SELECT LAST_INSERT_ID() AS accountId;
END $$

CREATE PROCEDURE sp_get_accounts(IN p_include_inactive TINYINT)
BEGIN
	SELECT
		account_id,
		account_name,
		account_type,
		opening_balance,
		is_active,
		created_at,
		updated_at
	FROM accounts
	WHERE p_include_inactive = 1 OR is_active = 1
	ORDER BY account_name;
END $$

CREATE PROCEDURE sp_update_account(
    IN p_account_id BIGINT UNSIGNED,
    IN p_account_name VARCHAR(100),
    IN p_account_type VARCHAR(20),
    IN p_opening_balance DECIMAL(12, 2)
)
BEGIN
    IF p_account_id IS NULL OR p_account_id = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid account ID is required';
    END IF;

    IF p_account_name IS NULL OR TRIM(p_account_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account name is required';
    END IF;

    IF p_opening_balance < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening balance cannot be negative';
    END IF;

    IF p_account_type NOT IN ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid account type';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_id = p_account_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found';
    END IF;

    UPDATE accounts
    SET
        account_name = TRIM(p_account_name),
        account_type = p_account_type,
        opening_balance = p_opening_balance
    WHERE account_id = p_account_id;

    SELECT ROW_COUNT() AS affectedRows;
END $$

CREATE PROCEDURE sp_deactivate_account(IN p_account_id BIGINT UNSIGNED)
BEGIN
	IF p_account_id IS NULL OR p_account_id = 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid account ID is required';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_id = p_account_id) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found';
	END IF;

	UPDATE accounts
	SET is_active = 0
	WHERE account_id = p_account_id;

	SELECT ROW_COUNT() AS affectedRows;
END $$

CREATE PROCEDURE sp_add_category(
	IN p_category_name VARCHAR(100),
	IN p_category_type VARCHAR(20)
)
BEGIN
	IF p_category_name IS NULL OR TRIM(p_category_name) = '' THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category name is required';
	END IF;

	IF p_category_type NOT IN ('INCOME', 'EXPENSE') THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category type must be INCOME or EXPENSE';
	END IF;

	INSERT INTO categories (category_name, category_type)
	VALUES (TRIM(p_category_name), p_category_type);

	SELECT LAST_INSERT_ID() AS categoryId;
END $$

CREATE PROCEDURE sp_get_categories(IN p_include_inactive TINYINT)
BEGIN
	SELECT
		category_id,
		category_name,
		category_type,
		is_active,
		created_at,
		updated_at
	FROM categories
	WHERE p_include_inactive = 1 OR is_active = 1
	ORDER BY category_type, category_name;
END $$

CREATE PROCEDURE sp_update_category(
	IN p_category_id BIGINT UNSIGNED,
	IN p_category_name VARCHAR(100),
	IN p_category_type VARCHAR(20)
)
BEGIN
	IF p_category_id IS NULL OR p_category_id = 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid category ID is required';
	END IF;

	IF p_category_name IS NULL OR TRIM(p_category_name) = '' THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category name is required';
	END IF;

	IF p_category_type NOT IN ('INCOME', 'EXPENSE') THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category type must be INCOME or EXPENSE';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category not found';
	END IF;

	UPDATE categories
	SET
		category_name = TRIM(p_category_name),
		category_type = p_category_type
	WHERE category_id = p_category_id;

	SELECT ROW_COUNT() AS affectedRows;
END $$

CREATE PROCEDURE sp_deactivate_category(IN p_category_id BIGINT UNSIGNED)
BEGIN
	IF p_category_id IS NULL OR p_category_id = 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid category ID is required';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category not found';
	END IF;

	UPDATE categories
	SET is_active = 0
	WHERE category_id = p_category_id;

	SELECT ROW_COUNT() AS affectedRows;
END $$

CREATE PROCEDURE sp_upsert_budget_plan(
	IN p_budget_year SMALLINT UNSIGNED,
	IN p_budget_month TINYINT UNSIGNED,
	IN p_category_id BIGINT UNSIGNED,
	IN p_planned_amount DECIMAL(12, 2),
	IN p_note VARCHAR(255)
)
BEGIN
	IF p_budget_year < 2000 OR p_budget_year > 2100 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Budget year must be between 2000 and 2100';
	END IF;

	IF p_budget_month < 1 OR p_budget_month > 12 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Budget month must be between 1 and 12';
	END IF;

	IF p_planned_amount < 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Planned amount cannot be negative';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id AND is_active = 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Active category is required';
	END IF;

	INSERT INTO budget_plans (
		budget_year,
		budget_month,
		category_id,
		planned_amount,
		note
	)
	VALUES (
		p_budget_year,
		p_budget_month,
		p_category_id,
		p_planned_amount,
		p_note
	)
	ON DUPLICATE KEY UPDATE
		planned_amount = VALUES(planned_amount),
		note = VALUES(note),
		updated_at = CURRENT_TIMESTAMP;

	SELECT
		plan_id,
		budget_year,
		budget_month,
		category_id,
		planned_amount,
		note,
		created_at,
		updated_at
	FROM budget_plans
	WHERE budget_year = p_budget_year
		AND budget_month = p_budget_month
		AND category_id = p_category_id
	LIMIT 1;
END $$

CREATE PROCEDURE sp_get_budget_plan_by_month(
	IN p_budget_year SMALLINT UNSIGNED,
	IN p_budget_month TINYINT UNSIGNED
)
BEGIN
	SELECT
		bp.plan_id,
		bp.budget_year,
		bp.budget_month,
		m.month_name,
		bp.category_id,
		c.category_name,
		c.category_type,
		bp.planned_amount,
		bp.note,
		bp.created_at,
		bp.updated_at
	FROM budget_plans bp
	INNER JOIN categories c ON c.category_id = bp.category_id
	INNER JOIN months m ON m.month_no = bp.budget_month
	WHERE bp.budget_year = p_budget_year
		AND bp.budget_month = p_budget_month
	ORDER BY c.category_type, c.category_name;
END $$

CREATE PROCEDURE sp_add_transaction(
	IN p_txn_date DATE,
	IN p_account_id BIGINT UNSIGNED,
	IN p_category_id BIGINT UNSIGNED,
	IN p_amount DECIMAL(12, 2),
	IN p_note VARCHAR(255)
)
BEGIN
	IF p_txn_date IS NULL THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction date is required';
	END IF;

	IF p_amount <= 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction amount must be greater than zero';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_id = p_account_id AND is_active = 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Active account is required';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id AND is_active = 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Active category is required';
	END IF;

	INSERT INTO transactions (txn_date, account_id, category_id, amount, note)
	VALUES (p_txn_date, p_account_id, p_category_id, p_amount, p_note);

	SELECT LAST_INSERT_ID() AS transactionId;
END $$

CREATE PROCEDURE sp_get_transactions(
	IN p_budget_year SMALLINT UNSIGNED,
	IN p_budget_month TINYINT UNSIGNED,
	IN p_account_id BIGINT UNSIGNED,
	IN p_category_id BIGINT UNSIGNED
)
BEGIN
	SELECT
		t.transaction_id,
		t.txn_date,
		t.account_id,
		a.account_name,
		t.category_id,
		c.category_name,
		c.category_type,
		t.amount,
		t.note,
		t.created_at,
		t.updated_at
	FROM transactions t
	INNER JOIN accounts a ON a.account_id = t.account_id
	INNER JOIN categories c ON c.category_id = t.category_id
	WHERE YEAR(t.txn_date) = p_budget_year
		AND MONTH(t.txn_date) = p_budget_month
		AND (p_account_id IS NULL OR p_account_id = 0 OR t.account_id = p_account_id)
		AND (p_category_id IS NULL OR p_category_id = 0 OR t.category_id = p_category_id)
	ORDER BY t.txn_date DESC, t.transaction_id DESC;
END $$

CREATE PROCEDURE sp_update_transaction(
	IN p_transaction_id BIGINT UNSIGNED,
	IN p_txn_date DATE,
	IN p_account_id BIGINT UNSIGNED,
	IN p_category_id BIGINT UNSIGNED,
	IN p_amount DECIMAL(12, 2),
	IN p_note VARCHAR(255)
)
BEGIN
	IF p_transaction_id IS NULL OR p_transaction_id = 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid transaction ID is required';
	END IF;

	IF p_txn_date IS NULL THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction date is required';
	END IF;

	IF p_amount <= 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction amount must be greater than zero';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM transactions WHERE transaction_id = p_transaction_id) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction not found';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_id = p_account_id AND is_active = 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Active account is required';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id AND is_active = 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Active category is required';
	END IF;

	UPDATE transactions
	SET
		txn_date = p_txn_date,
		account_id = p_account_id,
		category_id = p_category_id,
		amount = p_amount,
		note = p_note
	WHERE transaction_id = p_transaction_id;

	SELECT ROW_COUNT() AS affectedRows;
END $$

CREATE PROCEDURE sp_delete_transaction(IN p_transaction_id BIGINT UNSIGNED)
BEGIN
	IF p_transaction_id IS NULL OR p_transaction_id = 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid transaction ID is required';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM transactions WHERE transaction_id = p_transaction_id) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction not found';
	END IF;

	DELETE FROM transactions
	WHERE transaction_id = p_transaction_id;

	SELECT ROW_COUNT() AS affectedRows;
END $$

CREATE PROCEDURE sp_get_monthly_summary(
	IN p_budget_year SMALLINT UNSIGNED,
	IN p_budget_month TINYINT UNSIGNED
)
BEGIN
	SELECT
		p_budget_year AS budget_year,
		p_budget_month AS budget_month,
		COALESCE((
			SELECT SUM(bp.planned_amount)
			FROM budget_plans bp
			WHERE bp.budget_year = p_budget_year
				AND bp.budget_month = p_budget_month
		), 0.00) AS total_planned,
		COALESCE((
			SELECT SUM(bp.planned_amount)
			FROM budget_plans bp
			INNER JOIN categories c ON c.category_id = bp.category_id
			WHERE bp.budget_year = p_budget_year
				AND bp.budget_month = p_budget_month
				AND c.category_type = 'EXPENSE'
		), 0.00) AS total_planned_expense,
		COALESCE((
			SELECT SUM(t.amount)
			FROM transactions t
			INNER JOIN categories c ON c.category_id = t.category_id
			WHERE YEAR(t.txn_date) = p_budget_year
				AND MONTH(t.txn_date) = p_budget_month
				AND c.category_type = 'INCOME'
		), 0.00) AS total_actual_income,
		COALESCE((
			SELECT SUM(t.amount)
			FROM transactions t
			INNER JOIN categories c ON c.category_id = t.category_id
			WHERE YEAR(t.txn_date) = p_budget_year
				AND MONTH(t.txn_date) = p_budget_month
				AND c.category_type = 'EXPENSE'
		), 0.00) AS total_actual_expense,
		COALESCE((
			SELECT SUM(t.amount)
			FROM transactions t
			WHERE YEAR(t.txn_date) = p_budget_year
				AND MONTH(t.txn_date) = p_budget_month
		), 0.00) AS total_actual,
		(
			COALESCE((
				SELECT SUM(t.amount)
				FROM transactions t
				INNER JOIN categories c ON c.category_id = t.category_id
				WHERE YEAR(t.txn_date) = p_budget_year
					AND MONTH(t.txn_date) = p_budget_month
					AND c.category_type = 'INCOME'
			), 0.00)
			-
			COALESCE((
				SELECT SUM(t.amount)
				FROM transactions t
				INNER JOIN categories c ON c.category_id = t.category_id
				WHERE YEAR(t.txn_date) = p_budget_year
					AND MONTH(t.txn_date) = p_budget_month
					AND c.category_type = 'EXPENSE'
			), 0.00)
		) AS net_balance,
		(
			COALESCE((
				SELECT SUM(bp.planned_amount)
				FROM budget_plans bp
				INNER JOIN categories c ON c.category_id = bp.category_id
				WHERE bp.budget_year = p_budget_year
					AND bp.budget_month = p_budget_month
					AND c.category_type = 'EXPENSE'
			), 0.00)
			-
			COALESCE((
				SELECT SUM(t.amount)
				FROM transactions t
				INNER JOIN categories c ON c.category_id = t.category_id
				WHERE YEAR(t.txn_date) = p_budget_year
					AND MONTH(t.txn_date) = p_budget_month
					AND c.category_type = 'EXPENSE'
			), 0.00)
		) AS expense_variance;
END $$

CREATE PROCEDURE sp_get_monthly_category_variance(
	IN p_budget_year SMALLINT UNSIGNED,
	IN p_budget_month TINYINT UNSIGNED
)
BEGIN
	SELECT
		c.category_id,
		c.category_name,
		c.category_type,
		COALESCE(bp.planned_amount, 0.00) AS planned_amount,
		COALESCE(tx.actual_amount, 0.00) AS actual_amount,
		COALESCE(bp.planned_amount, 0.00) - COALESCE(tx.actual_amount, 0.00) AS variance
	FROM categories c
	LEFT JOIN (
		SELECT
			category_id,
			SUM(planned_amount) AS planned_amount
		FROM budget_plans
		WHERE budget_year = p_budget_year
			AND budget_month = p_budget_month
		GROUP BY category_id
	) bp ON bp.category_id = c.category_id
	LEFT JOIN (
		SELECT
			t.category_id,
			SUM(t.amount) AS actual_amount
		FROM transactions t
		WHERE YEAR(t.txn_date) = p_budget_year
			AND MONTH(t.txn_date) = p_budget_month
		GROUP BY t.category_id
	) tx ON tx.category_id = c.category_id
	WHERE bp.category_id IS NOT NULL
		 OR tx.category_id IS NOT NULL
	ORDER BY c.category_type, c.category_name;
END $$

CREATE PROCEDURE sp_get_annual_expense_trend(IN p_budget_year SMALLINT UNSIGNED)
BEGIN
	SELECT
		m.month_no,
		m.month_name,
		COALESCE(SUM(CASE WHEN c.category_id IS NOT NULL THEN t.amount ELSE 0 END), 0.00) AS total_expense
	FROM months m
	LEFT JOIN transactions t
		ON MONTH(t.txn_date) = m.month_no
	 AND YEAR(t.txn_date) = p_budget_year
	LEFT JOIN categories c
		ON c.category_id = t.category_id
	 AND c.category_type = 'EXPENSE'
	GROUP BY m.month_no, m.month_name
	ORDER BY m.month_no;
END $$

DELIMITER ;

-- Note: If you already created the database with the old account_type enum, run:
-- ALTER TABLE accounts MODIFY account_type ENUM('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT') NOT NULL DEFAULT 'CASH';
