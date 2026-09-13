-- Additive migration: existing transactions default to No. Safe to rerun.
-- Legacy write procedures remain available during the application rollout.
SET @regular_exists = (SELECT COUNT(*) FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'transactions' AND column_name = 'is_regular');
SET @regular_ddl = IF(@regular_exists = 0,
 'ALTER TABLE transactions ADD COLUMN is_regular BOOLEAN NOT NULL DEFAULT FALSE, ADD CONSTRAINT chk_transactions_is_regular CHECK (is_regular IN (0, 1))',
 'SELECT 1');
PREPARE regular_stmt FROM @regular_ddl;
EXECUTE regular_stmt;
DEALLOCATE PREPARE regular_stmt;
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_get_transactions $$
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
		t.is_tax_claimable,
		t.is_regular,
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

DROP PROCEDURE IF EXISTS sp_add_transaction_regular $$
CREATE PROCEDURE sp_add_transaction_regular(
	IN p_txn_date DATE,
	IN p_account_id BIGINT UNSIGNED,
	IN p_category_id BIGINT UNSIGNED,
	IN p_amount DECIMAL(12, 2),
	IN p_is_tax_claimable BOOLEAN,
	IN p_note VARCHAR(255),
    IN p_is_regular BOOLEAN
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

	IF p_is_tax_claimable IS NOT NULL
    AND p_is_tax_claimable NOT IN (0, 1) THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tax claimable must be true or false';
    END IF;

    IF COALESCE(p_is_tax_claimable, FALSE) = TRUE
        AND NOT EXISTS (
           SELECT 1
           FROM categories
           WHERE category_id = p_category_id
             AND category_type = 'EXPENSE'
    ) THEN
        SIGNAL SQLSTATE '45000'
           SET MESSAGE_TEXT = 'Only expense transactions can be tax claimable';
    END IF;

    IF p_is_regular IS NOT NULL AND p_is_regular NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Is Regular must be true or false';
    END IF;
    IF COALESCE(p_is_regular, FALSE) = TRUE AND NOT EXISTS (
        SELECT 1 FROM categories WHERE category_id = p_category_id AND category_type = 'EXPENSE'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only expense transactions can be regular';
    END IF;

	INSERT INTO transactions (txn_date, account_id, category_id, amount, is_tax_claimable, note, is_regular)
	VALUES (p_txn_date, p_account_id, p_category_id, p_amount, COALESCE(p_is_tax_claimable, FALSE), p_note, COALESCE(p_is_regular, FALSE));

	SELECT LAST_INSERT_ID() AS transactionId;
END $$

DROP PROCEDURE IF EXISTS sp_update_transaction_regular $$
CREATE PROCEDURE sp_update_transaction_regular(
	IN p_transaction_id BIGINT UNSIGNED,
	IN p_txn_date DATE,
	IN p_account_id BIGINT UNSIGNED,
	IN p_category_id BIGINT UNSIGNED,
	IN p_amount DECIMAL(12, 2),
	IN p_is_tax_claimable BOOLEAN,
	IN p_note VARCHAR(255),
    IN p_is_regular BOOLEAN
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

	IF p_is_tax_claimable IS NOT NULL
    AND p_is_tax_claimable NOT IN (0, 1) THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tax claimable must be true or false';
    END IF;

    IF COALESCE(p_is_tax_claimable, FALSE) = TRUE
        AND NOT EXISTS (
           SELECT 1
           FROM categories
           WHERE category_id = p_category_id
             AND category_type = 'EXPENSE'
    ) THEN
        SIGNAL SQLSTATE '45000'
           SET MESSAGE_TEXT = 'Only expense transactions can be tax claimable';
    END IF;

    IF p_is_regular IS NOT NULL AND p_is_regular NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Is Regular must be true or false';
    END IF;
    IF COALESCE(p_is_regular, FALSE) = TRUE AND NOT EXISTS (
        SELECT 1 FROM categories WHERE category_id = p_category_id AND category_type = 'EXPENSE'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only expense transactions can be regular';
    END IF;

	UPDATE transactions
	SET
		txn_date = p_txn_date,
		account_id = p_account_id,
		category_id = p_category_id,
		amount = p_amount,
		is_tax_claimable = COALESCE(p_is_tax_claimable, FALSE),
		is_regular = COALESCE(p_is_regular, FALSE),
		note = p_note
	WHERE transaction_id = p_transaction_id;

	SELECT ROW_COUNT() AS affectedRows;
END $$

DELIMITER ;
