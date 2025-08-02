// utils/db.helper.js
const mysql = require('mysql2/promise');
const config = require('../config/db.config');

async function callStoredProcedure(procName, inputObject) {
  const connection = await mysql.createConnection(config);

  try {
    const params = inputObject.map(el =>
      typeof el.value === 'string'
        ? `"${el.value.replace(/"/g, '\\"')}"`
        : el.value
    ).join(', ');

    const query = `CALL ${procName}(${params})`;
    console.log('Running SQL:', query); // Debug log

    const [rows] = await connection.query(query);
    return rows;
  } catch (err) {
    console.error('Stored procedure error:', err.sqlMessage || err.message);
    throw new Error(err.sqlMessage || err.message);
  } finally {
    await connection.end();
  }
}

module.exports = { callStoredProcedure };
