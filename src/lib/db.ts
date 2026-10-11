import "server-only";

import mysql from "mysql2/promise";

const globalForMysql = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to connect to MySQL.");
}

export const pool =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  });

if (process.env.NODE_ENV !== "production") {
  globalForMysql.mysqlPool = pool;
}
