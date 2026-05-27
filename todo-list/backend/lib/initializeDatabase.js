const ExcelJS = require('exceljs');

async function initializeDatabase(filePath) {
  const workbook = new ExcelJS.Workbook();

  // Users Sheet
  const usersSheet = workbook.addWorksheet('Users');
  usersSheet.columns = [
    { header: 'User_ID', key: 'User_ID', width: 15 },
    { header: 'Username', key: 'Username', width: 20 },
    { header: 'Email', key: 'Email', width: 30 },
    { header: 'Password_Hash', key: 'Password_Hash', width: 60 },
    { header: 'Created_At', key: 'Created_At', width: 25 },
    { header: 'Updated_At', key: 'Updated_At', width: 25 },
    { header: 'Settings_JSON', key: 'Settings_JSON', width: 50 },
  ];

  // Tasks Sheet
  const tasksSheet = workbook.addWorksheet('Tasks');
  tasksSheet.columns = [
    { header: 'Task_ID', key: 'Task_ID', width: 15 },
    { header: 'User_ID', key: 'User_ID', width: 15 },
    { header: 'Task_Name', key: 'Task_Name', width: 30 },
    { header: 'Description', key: 'Description', width: 50 },
    { header: 'Due_Date', key: 'Due_Date', width: 12 },
    { header: 'Status', key: 'Status', width: 15 },
    { header: 'Priority', key: 'Priority', width: 12 },
    { header: 'Category', key: 'Category', width: 15 },
    { header: 'Recurring', key: 'Recurring', width: 15 },
    { header: 'Estimated_Hours', key: 'Estimated_Hours', width: 15 },
    { header: 'Actual_Hours', key: 'Actual_Hours', width: 15 },
    { header: 'Related_Transaction_IDs', key: 'Related_Transaction_IDs', width: 30 },
    { header: 'Created_At', key: 'Created_At', width: 25 },
    { header: 'Updated_At', key: 'Updated_At', width: 25 },
    { header: 'Tags', key: 'Tags', width: 30 },
  ];

  // Transactions Sheet
  const transSheet = workbook.addWorksheet('Transactions');
  transSheet.columns = [
    { header: 'Transaction_ID', key: 'Transaction_ID', width: 15 },
    { header: 'User_ID', key: 'User_ID', width: 15 },
    { header: 'Task_ID', key: 'Task_ID', width: 15 },
    { header: 'Date', key: 'Date', width: 12 },
    { header: 'Amount', key: 'Amount', width: 12 },
    { header: 'Currency', key: 'Currency', width: 10 },
    { header: 'Type', key: 'Type', width: 10 },
    { header: 'Category', key: 'Category', width: 15 },
    { header: 'Subcategory', key: 'Subcategory', width: 18 },
    { header: 'Description', key: 'Description', width: 40 },
    { header: 'Payment_Method', key: 'Payment_Method', width: 15 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'Tags', key: 'Tags', width: 20 },
    { header: 'Created_At', key: 'Created_At', width: 25 },
    { header: 'Updated_At', key: 'Updated_At', width: 25 },
  ];

  // Style headers
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
  };

  [usersSheet, tasksSheet, transSheet].forEach(sheet => {
    sheet.getRow(1).font = headerStyle.font;
    sheet.getRow(1).fill = headerStyle.fill;
  });

  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Database initialized at ${filePath}`);
}

module.exports = initializeDatabase;
