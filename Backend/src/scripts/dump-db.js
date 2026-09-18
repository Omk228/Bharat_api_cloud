import 'dotenv/config';
import { dbPool } from '../core/config/db.config.js';
import fs from 'node:fs';
import path from 'node:path';

function escapeSqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\0/g, '\\0');
  return `'${str}'`;
}

async function dumpDatabase() {
  try {
    const timestamp = new Date().toISOString();
    let sql = `-- ========================================================\n`;
    sql += `-- Bharat API Cloud Complete MySQL Database Dump (Hostinger / phpMyAdmin Compatible)\n`;
    sql += `-- Generated on: ${timestamp}\n`;
    sql += `-- ========================================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    sql += `SET NAMES utf8mb4;\n\n`;

    const [tables] = await dbPool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    for (const table of tableNames) {
      console.log(`Dumping table: ${table}...`);
      sql += `-- --------------------------------------------------------\n`;
      sql += `-- Table structure for \`${table}\`\n`;
      sql += `-- --------------------------------------------------------\n`;
      sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;

      const [createRes] = await dbPool.query(`SHOW CREATE TABLE \`${table}\``);
      const createSql = createRes[0]['Create Table'] || createRes[0]['Create View'];
      sql += `${createSql};\n\n`;

      const [rows] = await dbPool.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        sql += `-- Dumping data for table \`${table}\` (${rows.length} rows)\n`;
        const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
        
        for (const row of rows) {
          const values = Object.values(row).map(escapeSqlVal).join(', ');
          sql += `INSERT INTO \`${table}\` (${columns}) VALUES (${values});\n`;
        }
        sql += `\n`;
      }
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const rootDumpPath = path.resolve('..', 'bharat_api_dump.sql');
    const backendDumpPath = path.resolve('bharat_api_dump.sql');

    fs.writeFileSync(rootDumpPath, sql, 'utf-8');
    fs.writeFileSync(backendDumpPath, sql, 'utf-8');

    console.log(`✅ Successfully generated updated database dump (${(Buffer.byteLength(sql, 'utf-8') / 1024).toFixed(1)} KB)`);
    console.log(`Saved to: ${rootDumpPath} and ${backendDumpPath}`);

    await dbPool.end();
  } catch (err) {
    console.error('Error generating DB dump:', err);
    process.exit(1);
  }
}

dumpDatabase();
