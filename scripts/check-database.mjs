import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing from .env.local.");
  process.exit(1);
}

let database;
let databaseName;
try {
  database = new URL(databaseUrl);
  databaseName = decodeURIComponent(database.pathname.replace(/^\//, ""));
} catch {
  console.error(
    "DATABASE_URL is invalid. Use mysql://USER:PASSWORD@HOST:3306/smartcart.",
  );
  process.exit(1);
}
if (
  database.protocol !== "mysql:" ||
  !database.hostname ||
  !database.username ||
  !databaseName
) {
  console.error(
    "DATABASE_URL must include a MySQL host, username, and database name.",
  );
  process.exit(1);
}

console.log(
  `Checking MySQL at ${database.hostname}:${database.port || "3306"} ` +
    `for database "${databaseName}" (credentials hidden).`,
);

let connection;

try {
  connection = await mysql.createConnection({
    uri: databaseUrl,
    connectTimeout: 5_000,
  });

  const [tableRows] = await connection.execute(
    `SELECT TABLE_NAME AS table_name
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('creator_settings', 'users', 'orders')`,
    [databaseName],
  );
  const tables = new Set(tableRows.map((row) => row.table_name));
  const missingTables = ["creator_settings", "users", "orders"].filter(
    (table) => !tables.has(table),
  );

  if (missingTables.length > 0) {
    console.error(
      `Connected, but missing tables: ${missingTables.join(", ")}. ` +
        "For a fresh database, run database/schema.sql.",
    );
    process.exitCode = 1;
  } else {
    const [columnRows] = await connection.execute(
      `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND (
           (TABLE_NAME = 'creator_settings'
             AND COLUMN_NAME IN (
               'creator_name', 'creator_email', 'brand_description',
               'currency', 'base_price_cents'
             ))
           OR (TABLE_NAME = 'users'
             AND COLUMN_NAME IN (
               'id', 'name', 'email', 'password_hash', 'created_at'
             ))
           OR (TABLE_NAME = 'orders'
             AND COLUMN_NAME IN (
               'id', 'customer_email', 'customer_request', 'product_title',
               'product_content', 'price_cents', 'currency',
               'paypal_order_id', 'paypal_capture_id', 'status',
               'delivery_token', 'delivered_at', 'created_at', 'updated_at'
             ))
         )`,
      [databaseName],
    );
    const columns = new Set(
      columnRows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    const requiredColumns = [
      "creator_settings.creator_name",
      "creator_settings.creator_email",
      "creator_settings.brand_description",
      "creator_settings.currency",
      "creator_settings.base_price_cents",
      "users.id",
      "users.name",
      "users.email",
      "users.password_hash",
      "users.created_at",
      "orders.id",
      "orders.customer_email",
      "orders.customer_request",
      "orders.product_title",
      "orders.product_content",
      "orders.price_cents",
      "orders.currency",
      "orders.paypal_order_id",
      "orders.paypal_capture_id",
      "orders.status",
      "orders.delivery_token",
      "orders.delivered_at",
      "orders.created_at",
      "orders.updated_at",
    ];
    const missingColumns = requiredColumns.filter(
      (column) => !columns.has(column),
    );

    if (missingColumns.length > 0) {
      console.error(
        `Connected, but the schema is incomplete: ${missingColumns.join(", ")}. ` +
          "For an existing database, run database/dashboard.sql; " +
          "for a fresh database, run database/schema.sql.",
      );
      process.exitCode = 1;
    } else {
      console.log("Connection succeeded and the SmartCart schema is ready.");
    }
  }
} catch (error) {
  const code = error instanceof Error && "code" in error ? error.code : "";
  console.error(`MySQL check failed${code ? ` (${code})` : ""}.`);

  if (code === "ER_ACCESS_DENIED_ERROR") {
    console.error(
      "Verify the configured username and password, the account's allowed host " +
        "('localhost' and '127.0.0.1' may be distinct), and its grants. " +
        "Do not share your credentials.",
    );
  } else if (code === "ECONNREFUSED") {
    console.error("Verify that MySQL is running and the host and port are correct.");
  } else if (code === "ER_BAD_DB_ERROR") {
    console.error(
      "The database does not exist. Create it and run database/schema.sql.",
    );
  } else {
    console.error("Check the MySQL server, URL encoding, and database privileges.");
  }

  process.exitCode = 1;
} finally {
  await connection?.end();
}
