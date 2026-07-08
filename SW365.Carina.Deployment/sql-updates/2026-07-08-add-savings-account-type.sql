ALTER TABLE accounts
	MODIFY account_type ENUM('CASH', 'SAVINGS', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT') NOT NULL DEFAULT 'CASH';

DROP PROCEDURE IF EXISTS sp_add_account;
DROP PROCEDURE IF EXISTS sp_update_account;

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

	IF p_account_type NOT IN ('CASH', 'SAVINGS', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT') THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid account type';
	END IF;

	INSERT INTO accounts (account_name, account_type, opening_balance)
	VALUES (TRIM(p_account_name), p_account_type, p_opening_balance);

	SELECT LAST_INSERT_ID() AS accountId;
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

	IF p_account_type NOT IN ('CASH', 'SAVINGS', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT') THEN
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

DELIMITER ;
