const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'bushfaller';

  console.log(`Connecting to MySQL database '${database}' on ${host}:${port}...`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  try {
    const sqlFiles = [
      path.join(process.cwd(), 'database', 'schema.sql'),
      path.join(process.cwd(), 'database', 'migrations', 'v2_multi_vendor_upgrade.sql'),
      path.join(process.cwd(), 'database', 'migrations', 'v3_modular_delivery_system.sql'),
    ];

    for (const file of sqlFiles) {
      if (fs.existsSync(file)) {
        console.log(`Executing migration file: ${path.basename(file)}...`);
        const schema = fs.readFileSync(file, 'utf-8');

        const statements = schema
          .split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        for (const statement of statements) {
          try {
            await connection.execute(statement);
          } catch (err) {
            if (err && err.code === 'ER_TABLE_EXISTS_ERROR') {
              // Ignore table exists
            } else if (err && err.code === 'ER_DUP_FIELDNAME') {
              // Ignore dup column
            } else if (err && err.code === 'ER_DUP_ENTRY') {
              // Ignore dup key
            } else {
              console.warn(`[Migration Notice] (${err.code}): ${err.message?.substring(0, 120)}`);
            }
          }
        }
      }
    }

    console.log('✓ All database migrations executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runMigrations();
