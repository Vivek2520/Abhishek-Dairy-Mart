const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');
const { config } = require('../config');

// Optional database client library (Postgres example)
const { Client } = require('pg');

/**
 * Read the users Excel file and load rows into warehouse table
 * Connection string should be provided via WAREHOUSE_DB_URL env var
 */
async function syncExcelToWarehouse() {
  const filePath = path.join(config.paths.exportsDir, 'users', 'users.xlsx');

  if (!fs.existsSync(filePath)) {
    console.warn('[WAREHOUSE] Excel file not found, skipping sync');
    return;
  }

  // connect to warehouse
  const dbUrl = process.env.WAREHOUSE_DB_URL;
  if (!dbUrl) {
    console.warn('[WAREHOUSE] WAREHOUSE_DB_URL not set, skipping sync');
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  // make sure table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS users_from_excel (
      user_id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      registration_date TIMESTAMP,
      last_updated TIMESTAMP
    )
  `);

  // read workbook
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet('Users');

  // start transaction
  await client.query('BEGIN');
  try {
    await client.query('TRUNCATE users_from_excel');

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const [userId, name, email, phone, address, registrationDate, lastUpdated] = row.values.slice(1); // 1-indexed
      client.query(
        `INSERT INTO users_from_excel(user_id,name,email,phone,address,registration_date,last_updated)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET
           name=EXCLUDED.name,
           email=EXCLUDED.email,
           phone=EXCLUDED.phone,
           address=EXCLUDED.address,
           registration_date=EXCLUDED.registration_date,
           last_updated=EXCLUDED.last_updated`,
        [userId, name, email, phone, address, registrationDate || null, lastUpdated || null]
      );
    });

    await client.query('COMMIT');
    console.log('[WAREHOUSE] Sync completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[WAREHOUSE] Sync failed', err.message);
  } finally {
    await client.end();
  }
}

module.exports = {
  syncExcelToWarehouse
};
