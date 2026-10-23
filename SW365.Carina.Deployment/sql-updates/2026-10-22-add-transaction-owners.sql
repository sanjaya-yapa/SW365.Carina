CREATE TABLE IF NOT EXISTS transaction_owners (
    owner_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(201) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
    email_address VARCHAR(254) NULL,
    phone_number VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add the relationship only once, allowing a failed deployment to be retried.
SET @owner_column_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'owner_id'
);
SET @owner_ddl = IF(@owner_column_exists = 0,
    'ALTER TABLE transactions ADD COLUMN owner_id BIGINT UNSIGNED NULL,
     ADD CONSTRAINT fk_transactions_owner FOREIGN KEY (owner_id)
     REFERENCES transaction_owners (owner_id) ON UPDATE CASCADE ON DELETE RESTRICT',
    'SELECT 1');
PREPARE owner_statement FROM @owner_ddl;
EXECUTE owner_statement;
DEALLOCATE PREPARE owner_statement;

-- Apply SW365.Carina.WebApp/sql/procedures.sql after this migration and before starting the new app.
