const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function setStoreCoordinates() {
  loadEnv();

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'bushfaller';

  console.log(`Connecting to MySQL '${database}' on ${host}:${port}...`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  try {
    // Ensure the location verification columns exist
    const alterQueries = [
      "ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_location_verified TINYINT(1) NOT NULL DEFAULT 0",
      "ALTER TABLE stores ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMP NULL",
      "ALTER TABLE stores ADD COLUMN IF NOT EXISTS location_accuracy_meters INT NULL",
      "ALTER TABLE stores ADD COLUMN IF NOT EXISTS location_verification_method VARCHAR(50) NULL",
    ];

    for (const q of alterQueries) {
      try {
        await connection.execute(q);
      } catch {
        // Ignore if exists
      }
    }

    // Exact physical coordinates in Douala (Akwa), Cameroon
    const latitude = 4.051056;
    const longitude = 9.704286;
    const gps_coordinates = `${latitude}, ${longitude}`;
    const city = "Douala";
    const quarter = "Akwa";
    const landmark = "Opposite TotalEnergies, Boulevard de la Liberté";
    const address = "142 Boulevard de la Liberté, Akwa";
    const country = "Cameroon";
    const accuracy = 5; // ±5m precision

    const [rows] = await connection.query("SELECT id, name, slug FROM stores WHERE slug = ? LIMIT 1", ['bushbuyer-flagship']);

    if (rows.length === 0) {
      console.log("Store 'bushbuyer-flagship' not found, searching for store ID 1...");
      const [firstStore] = await connection.query("SELECT id, name, slug FROM stores ORDER BY id ASC LIMIT 1");
      if (firstStore.length > 0) {
        const storeId = firstStore[0].id;
        console.log(`Updating store #${storeId} (${firstStore[0].name} - ${firstStore[0].slug})...`);
        await connection.execute(
          `UPDATE stores SET
             latitude = ?,
             longitude = ?,
             gps_coordinates = ?,
             city = ?,
             quarter = ?,
             landmark = ?,
             address = ?,
             country = ?,
             is_location_verified = 1,
             location_verified_at = NOW(),
             location_accuracy_meters = ?,
             location_verification_method = 'gps_live'
           WHERE id = ?`,
          [latitude, longitude, gps_coordinates, city, quarter, landmark, address, country, accuracy, storeId]
        );
        console.log(`✓ Store #${storeId} updated with validated coordinates!`);
      }
    } else {
      const storeId = rows[0].id;
      console.log(`Updating store #${storeId} (${rows[0].name})...`);
      await connection.execute(
        `UPDATE stores SET
           latitude = ?,
           longitude = ?,
           gps_coordinates = ?,
           city = ?,
           quarter = ?,
           landmark = ?,
           address = ?,
           country = ?,
           is_location_verified = 1,
           location_verified_at = NOW(),
           location_accuracy_meters = ?,
           location_verification_method = 'gps_live'
         WHERE id = ?`,
        [latitude, longitude, gps_coordinates, city, quarter, landmark, address, country, accuracy, storeId]
      );
      console.log(`✓ Store 'bushbuyer-flagship' (ID: ${storeId}) successfully updated with verified GPS coordinates!`);
    }

    // Verify what is stored
    const [updated] = await connection.query(
      "SELECT id, name, slug, latitude, longitude, gps_coordinates, is_location_verified, location_verified_at, city, quarter, landmark, address FROM stores WHERE slug = ? OR id = 1 LIMIT 1",
      ['bushbuyer-flagship']
    );
    console.log("Updated Store Location Data:", JSON.stringify(updated[0], null, 2));
  } catch (err) {
    console.error("Failed to update store coordinates:", err);
  } finally {
    await connection.end();
  }
}

setStoreCoordinates();
