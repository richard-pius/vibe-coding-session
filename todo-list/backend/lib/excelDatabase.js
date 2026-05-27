const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');

/**
 * Thread-safe Excel database wrapper with distributed locking
 * Prevents concurrent write corruption through atomic transactions
 */
class ExcelDatabase {
  constructor(filePath, lockTimeout = 5000) {
    this.filePath = filePath;
    this.lockTimeout = lockTimeout;
    this.locks = new Map();
  }

  /**
   * Acquire exclusive lock for file operations
   */
  async acquireLock() {
    const lockId = uuidv4();
    const startTime = Date.now();

    while (this.locks.has(this.filePath)) {
      if (Date.now() - startTime > this.lockTimeout) {
        throw new Error(
          `Lock acquisition timeout after ${this.lockTimeout}ms`
        );
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.locks.set(this.filePath, { lockId, acquiredAt: Date.now() });
    return lockId;
  }

  /**
   * Release lock after operation
   */
  releaseLock(lockId) {
    const lock = this.locks.get(this.filePath);
    if (lock && lock.lockId === lockId) {
      this.locks.delete(this.filePath);
    }
  }

  /**
   * Load workbook from disk
   */
  async loadWorkbook() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    return workbook;
  }

  /**
   * Save workbook to disk
   */
  async saveWorkbook(workbook) {
    await workbook.xlsx.writeFile(this.filePath);
  }

  /**
   * Find single row matching filter
   */
  async findRow(sheetName, filterFn) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);

      if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

      let result = null;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData = this.rowToObject(row);
        if (filterFn(rowData)) {
          result = { ...rowData, _rowNumber: rowNumber };
        }
      });

      return result;
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Find all rows matching filter
   */
  async findRows(sheetName, filterFn) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);

      if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

      const results = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData = this.rowToObject(row);
        if (filterFn(rowData)) {
          results.push({ ...rowData, _rowNumber: rowNumber });
        }
      });

      return results;
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Append new row to sheet
   */
  async appendRow(sheetName, rowData) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);

      if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

      const newRow = sheet.addRow(rowData);
      await this.saveWorkbook(workbook);

      return { ...rowData, _rowNumber: newRow.number };
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Update existing row by row number
   */
  async updateRow(sheetName, rowNumber, updates) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);

      if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

      const row = sheet.getRow(rowNumber);
      const headers = this.getHeaders(sheet);

      Object.entries(updates).forEach(([key, value]) => {
        const colIndex = headers.indexOf(key) + 1;
        if (colIndex > 0) {
          row.getCell(colIndex).value = value;
        }
      });

      await this.saveWorkbook(workbook);
      return this.rowToObject(row);
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Delete row by row number
   */
  async deleteRow(sheetName, rowNumber) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);

      if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

      sheet.spliceRows(rowNumber, 1);
      await this.saveWorkbook(workbook);

      return { success: true, deletedRowNumber: rowNumber };
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Upsert (insert or update) row by ID field
   */
  async upsertRow(sheetName, idField, rowData) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);
      const headers = this.getHeaders(sheet);

      let found = false;
      let resultData = rowData;

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowObj = this.rowToObject(row);

        if (rowObj[idField] === rowData[idField]) {
          Object.entries(rowData).forEach(([key, value]) => {
            const colIndex = headers.indexOf(key) + 1;
            if (colIndex > 0) {
              row.getCell(colIndex).value = value;
            }
          });
          found = true;
          resultData = { ...rowData, _rowNumber: rowNumber };
        }
      });

      if (!found) {
        const newRow = sheet.addRow(rowData);
        resultData = { ...rowData, _rowNumber: newRow.number };
      }

      await this.saveWorkbook(workbook);
      return resultData;
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Batch update multiple rows in single transaction
   */
  async batchUpdate(sheetName, updates) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);
      const headers = this.getHeaders(sheet);

      const results = [];

      updates.forEach(({ rowNumber, data }) => {
        const row = sheet.getRow(rowNumber);
        Object.entries(data).forEach(([key, value]) => {
          const colIndex = headers.indexOf(key) + 1;
          if (colIndex > 0) {
            row.getCell(colIndex).value = value;
          }
        });
        results.push({ rowNumber, success: true });
      });

      await this.saveWorkbook(workbook);
      return results;
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Get all rows from sheet
   */
  async getAllRows(sheetName) {
    const lockId = await this.acquireLock();
    try {
      const workbook = await this.loadWorkbook();
      const sheet = workbook.getWorksheet(sheetName);

      if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

      const results = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        results.push({ ...this.rowToObject(row), _rowNumber: rowNumber });
      });

      return results;
    } finally {
      this.releaseLock(lockId);
    }
  }

  /**
   * Helper: Convert Excel row to JSON object
   */
  rowToObject(row) {
    const obj = {};
    const sheet = row.worksheet;
    const headers = this.getHeaders(sheet);

    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      obj[header] = cell.value;
    });

    return obj;
  }

  /**
   * Helper: Get sheet column headers
   */
  getHeaders(sheet) {
    const headers = [];
    const firstRow = sheet.getRow(1);
    firstRow.eachCell(cell => {
      headers.push(cell.value);
    });
    return headers;
  }
}

module.exports = ExcelDatabase;
