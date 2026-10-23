const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

test(
  'MySQL owner schema, migration, relationships and procedures',
  {
    skip: process.env.TRANSACTION_OWNER_DB_TEST !== '1',
  },
  async () => {
    require('dotenv').config({ quiet: true });
    const database = `carina_owner_test_${process.pid}_${Date.now()}`;
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
    });
    const schema = fs
      .readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8')
      .replaceAll('personal_finance', database);
    const procedures = fs
      .readFileSync(path.join(__dirname, '../sql/procedures.sql'), 'utf8')
      .replaceAll('personal_finance', database)
      .replace(/^DELIMITER .+$/gm, '')
      .split('$$');
    const migration = fs.readFileSync(
      path.join(
        __dirname,
        '../../SW365.Carina.Deployment/sql-updates/2026-10-22-add-transaction-owners.sql'
      ),
      'utf8'
    );
    try {
      await connection.query(schema);
      await connection.query(
        "INSERT INTO accounts (account_name, account_type) VALUES ('Test', 'CASH')"
      );
      await connection.query(
        "INSERT INTO categories (category_name, category_type) VALUES ('Test', 'EXPENSE')"
      );
      // Simulate an existing installation with transactions and no owner table.
      await connection.query(
        'ALTER TABLE transactions DROP FOREIGN KEY fk_transactions_owner, DROP COLUMN owner_id'
      );
      await connection.query('DROP TABLE transaction_owners');
      await connection.query(`INSERT INTO transactions (txn_date, account_id, category_id, amount)
      VALUES ('2026-10-22', 1, 1, 10)`);
      await connection.query(migration);
      await connection.query(migration);
      for (const statement of procedures) {
        if (statement.trim()) await connection.query(statement);
      }
      const [[legacy]] = await connection.query(
        'SELECT * FROM transactions WHERE transaction_id = 1'
      );
      assert.equal(legacy.owner_id, null);
      await connection.query(`INSERT INTO transaction_owners
      (first_name, last_name, email_address, phone_number) VALUES ('First', 'Last', 'test@example.com', '+61 123')`);
      const [[owner]] = await connection.query('SELECT * FROM transaction_owners');
      assert.equal(owner.full_name, 'First Last');
      for (let index = 0; index < 2; index++) {
        await connection.query(
          "CALL sp_add_transaction_regular('2026-10-22', 1, 1, 10, false, NULL, true, 1)"
        );
      }
      const [[{ count }]] = await connection.query(
        'SELECT COUNT(*) AS count FROM transactions WHERE owner_id = 1'
      );
      assert.equal(count, 2);
      const [listed] = await connection.query('CALL sp_get_transactions(2026, 10, NULL, NULL)');
      assert.equal(listed[0].length, 3);
      assert.equal(listed[0][0].owner_full_name, 'First Last');
      await connection.query(
        "UPDATE transaction_owners SET first_name = 'Changed' WHERE owner_id = 1"
      );
      const [renamed] = await connection.query('CALL sp_get_transactions(2026, 10, NULL, NULL)');
      assert.equal(renamed[0][0].owner_full_name, 'Changed Last');
      await connection.query(
        "CALL sp_update_transaction_regular(2, '2026-10-22', 1, 1, 20, false, NULL, true, NULL, false)"
      );
      const [[preserved]] = await connection.query(
        'SELECT owner_id FROM transactions WHERE transaction_id = 2'
      );
      assert.equal(preserved.owner_id, 1);
      await connection.query(
        "CALL sp_update_transaction_regular(2, '2026-10-22', 1, 1, 20, false, NULL, true, NULL, true)"
      );
      const [[cleared]] = await connection.query(
        'SELECT owner_id FROM transactions WHERE transaction_id = 2'
      );
      assert.equal(cleared.owner_id, null);
      await assert.rejects(
        connection.query(
          "CALL sp_add_transaction_regular('2026-10-22', 1, 1, 10, false, NULL, false, 999)"
        ),
        /owner not found/
      );
      await assert.rejects(
        connection.query('DELETE FROM transaction_owners WHERE owner_id = 1'),
        (error) => error.code === 'ER_ROW_IS_REFERENCED_2'
      );
      await assert.rejects(
        connection.query('UPDATE transactions SET owner_id = 999 WHERE transaction_id = 1'),
        (error) => error.code === 'ER_NO_REFERENCED_ROW_2'
      );
    } finally {
      await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
      await connection.end();
    }
  }
);
