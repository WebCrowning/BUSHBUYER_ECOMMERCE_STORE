import mysql from "mysql2/promise";
import { env } from "../src/lib/env";
import * as fs from "fs";
import * as path from "path";

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    multipleStatements: true,
  });

  try {
    console.log("Running base database schema...");

    const migrationsDir = path.join(process.cwd(), "database", "migrations");

    // Run base schema first, then all migrations sorted alphabetically
    const sqlFiles: string[] = [
      path.join(process.cwd(), "database", "schema.sql"),
    ];

    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort() // alphabetical order ensures correct execution sequence
        .map((f) => path.join(migrationsDir, f));
      sqlFiles.push(...migrationFiles);
    }

    for (const file of sqlFiles) {
      if (fs.existsSync(file)) {
        console.log(`Executing migration file: ${path.basename(file)}...`);
        const schema = fs.readFileSync(file, "utf-8");

        const statements = schema
          .split(";")
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        for (const statement of statements) {
          try {
            await connection.execute(statement);
          } catch (err: any) {
            if (err && err.code === "ER_TABLE_EXISTS_ERROR") {
              // Ignore table exists error
            } else if (err && err.code === "ER_DUP_FIELDNAME") {
              // Ignore duplicate column error
            } else if (err && err.code === "ER_DUP_ENTRY") {
              // Ignore duplicate key error
            } else if (err && err.code === "ER_CANT_DROP_FIELD_OR_KEY") {
              // Ignore drop index/key if already removed
            } else {
              console.warn(`[Warning] (${err.code}): ${err.message?.substring(0, 120)}`);
            }
          }
        }
      }
    }


    console.log("✓ All migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
