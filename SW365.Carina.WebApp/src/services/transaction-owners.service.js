const db = require('../config/db');

async function getOwners() {
  const [rows] = await db.execute('SELECT * FROM transaction_owners ORDER BY full_name, owner_id');
  return rows;
}

async function getOwnerById(id) {
  const [rows] = await db.execute('SELECT * FROM transaction_owners WHERE owner_id = ?', [id]);
  if (!rows[0]) throw new Error('Transaction owner not found');
  return rows[0];
}

async function createOwner({ firstName, lastName, emailAddress, phoneNumber }) {
  const [result] = await db.execute(
    `INSERT INTO transaction_owners (first_name, last_name, email_address, phone_number)
     VALUES (?, ?, ?, ?)`,
    [firstName, lastName, emailAddress, phoneNumber]
  );
  return getOwnerById(result.insertId);
}

async function updateOwner(id, { firstName, lastName, emailAddress, phoneNumber }) {
  await getOwnerById(id);
  await db.execute(
    `UPDATE transaction_owners SET first_name = ?, last_name = ?, email_address = ?,
     phone_number = ? WHERE owner_id = ?`,
    [firstName, lastName, emailAddress, phoneNumber, id]
  );
  return getOwnerById(id);
}

module.exports = { getOwners, getOwnerById, createOwner, updateOwner };
