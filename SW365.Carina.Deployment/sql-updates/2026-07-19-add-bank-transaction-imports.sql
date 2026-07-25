CREATE TABLE IF NOT EXISTS bank_transaction_imports (
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
