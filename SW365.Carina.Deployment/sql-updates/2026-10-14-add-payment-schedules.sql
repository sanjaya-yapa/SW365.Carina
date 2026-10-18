CREATE TABLE IF NOT EXISTS payment_schedules (
  schedule_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  frequency ENUM('WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','YEARLY') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_account FOREIGN KEY (account_id) REFERENCES accounts(account_id),
  CONSTRAINT fk_payment_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
  CONSTRAINT chk_payment_amount CHECK (amount > 0),
  CONSTRAINT chk_payment_end CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE TABLE IF NOT EXISTS payment_occurrences (
  schedule_id BIGINT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  transaction_id BIGINT UNSIGNED NULL,
  is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (schedule_id, due_date),
  UNIQUE KEY uq_payment_transaction (transaction_id),
  CONSTRAINT fk_occurrence_schedule FOREIGN KEY (schedule_id) REFERENCES payment_schedules(schedule_id),
  CONSTRAINT fk_occurrence_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL,
  CONSTRAINT chk_occurrence_skip CHECK (is_skipped IN (0,1))
);
