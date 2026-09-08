import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

async function generateDump() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Om@222006',
    database: 'bharat_api'
  });

  let sql = '-- ========================================================\n';
  sql += '-- Bharat API Cloud Complete MySQL Database Dump (phpMyAdmin / Hostinger Compatible)\n';
  sql += '-- Generated on: ' + new Date().toISOString() + '\n';
  sql += '-- Compatible with: Hostinger phpMyAdmin, MariaDB, MySQL 8.0+, TiDB, Aiven\n';
  sql += '-- ========================================================\n\n';
  sql += 'SET FOREIGN_KEY_CHECKS = 0;\n';
  sql += 'SET NAMES utf8mb4;\n\n';

  const [tables] = await conn.query('SHOW TABLES');

  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [[createTableResult]] = await conn.query('SHOW CREATE TABLE `' + tableName + '`');
    const createTableSql = createTableResult['Create Table'];

    sql += '-- --------------------------------------------------------\n';
    sql += '-- Table structure for `' + tableName + '`\n';
    sql += '-- --------------------------------------------------------\n';
    sql += 'DROP TABLE IF EXISTS `' + tableName + '`;\n';
    sql += createTableSql + ';\n\n';

    const [rows] = await conn.query('SELECT * FROM `' + tableName + '`');
    if (rows.length > 0) {
      sql += '-- Dumping data for table `' + tableName + '` (' + rows.length + ' rows)\n';
      const columns = Object.keys(rows[0]).map(c => '`' + c + '`').join(', ');
      
      for (const row of rows) {
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (val instanceof Date) return "'" + val.toISOString().slice(0, 19).replace('T', ' ') + "'";
          if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
          return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
        }).join(', ');
        sql += 'INSERT INTO `' + tableName + '` (' + columns + ') VALUES (' + values + ');\n';
      }
      sql += '\n';
    }
  }

  sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
  sql += '-- ==================== END OF DUMP ====================\n';

  const targetPath = path.resolve('..', 'bharat_api_dump.sql');
  const backendDumpPath = path.resolve('bharat_api_dump.sql');
  fs.writeFileSync(targetPath, sql, 'utf-8');
  fs.writeFileSync(backendDumpPath, sql, 'utf-8');
  console.log('Successfully generated SQL Dump at:', targetPath, 'Size:', (sql.length / 1024).toFixed(2), 'KB');
  await conn.end();
}

generateDump().catch(console.error);
