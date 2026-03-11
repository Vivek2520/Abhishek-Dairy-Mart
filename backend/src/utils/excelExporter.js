const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');
const { Mutex } = require('async-mutex');
const { config } = require('../config');

// Simple mutex to prevent concurrent writes to the same Excel file
const mutex = new Mutex();

/**
 * Get full path to the user excel file
 */
function getUserExcelPath() {
  return path.join(config.paths.exportsDir, 'users', 'users.xlsx');
}

/**
 * Ensure that the exports/users directory exists and the excel workbook has headers
 */
async function initUserExcel() {
  const filePath = getUserExcelPath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const workbook = new Excel.Workbook();
    const sheet = workbook.addWorksheet('Users');

    sheet.columns = [
      { header: 'User ID', key: 'userId', width: 36 },
      { header: 'Full Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 50 },
      { header: 'Registration Date', key: 'registrationDate', width: 20 },
      { header: 'Last Updated', key: 'lastUpdated', width: 20 }
    ];

    await workbook.xlsx.writeFile(filePath);
    console.log('[INFO] Created new users Excel file at', filePath);
  }
}

/**
 * Formats the first address object into a single line string
 */
function formatAddress(addresses) {
  if (!addresses || addresses.length === 0) {
    return '';
  }
  const a = addresses[0];
  const parts = [];
  if (a.street) parts.push(a.street);
  if (a.city) parts.push(a.city);
  if (a.state) parts.push(a.state);
  if (a.pincode) parts.push(a.pincode);
  return parts.join(', ');
}

/**
 * Add or update a user row in the Excel file.  Existing row is matched by userId.
 * Uses a mutex to serialize access and avoid corruption.
 * @param {Object} user - user object from database/file
 */
async function addOrUpdateUser(user) {
  return mutex.runExclusive(async () => {
    await initUserExcel();

    const filePath = getUserExcelPath();
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Users');

    // try to find existing row
    let existingRow;
    sheet.eachRow((row, rowNumber) => {
      if (row.getCell('A').value === user.id) {
        existingRow = row;
      }
    });

    const address = formatAddress(user.addresses);

    const rowValues = {
      userId: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      address,
      registrationDate: user.createdAt || '',
      lastUpdated: user.updatedAt || new Date().toISOString()
    };

    if (existingRow) {
      existingRow.values = [
        rowValues.userId,
        rowValues.name,
        rowValues.email,
        rowValues.phone,
        rowValues.address,
        rowValues.registrationDate,
        rowValues.lastUpdated
      ];
    } else {
      sheet.addRow(rowValues);
    }

    await workbook.xlsx.writeFile(filePath);
  });
}

module.exports = {
  initUserExcel,
  addOrUpdateUser
};
