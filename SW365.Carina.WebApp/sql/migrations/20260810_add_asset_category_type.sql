ALTER TABLE categories
  MODIFY COLUMN category_type ENUM('INCOME', 'EXPENSE', 'ASSET') NOT NULL;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_add_category$$
CREATE PROCEDURE sp_add_category(
	IN p_category_name VARCHAR(100),
	IN p_category_type VARCHAR(20)
)
BEGIN
	IF p_category_name IS NULL OR TRIM(p_category_name) = '' THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category name is required';
	END IF;

	IF p_category_type NOT IN ('INCOME', 'EXPENSE', 'ASSET') THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category type must be INCOME, EXPENSE, or ASSET';
	END IF;

	INSERT INTO categories (category_name, category_type)
	VALUES (TRIM(p_category_name), p_category_type);

	SELECT LAST_INSERT_ID() AS categoryId;
END$$

DROP PROCEDURE IF EXISTS sp_update_category$$
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

	IF p_category_type NOT IN ('INCOME', 'EXPENSE', 'ASSET') THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category type must be INCOME, EXPENSE, or ASSET';
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
END$$

DELIMITER ;
