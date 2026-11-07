const mysql = require("mysql2/promise");
require("dotenv").config();

const requiredEnv = ["DB_HOST", "DB_USER", "DB_NAME"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    console.warn(`Konfigurasi database belum lengkap: ${missingEnv.join(", ")}`);
}

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bersihinlaundry",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    decimalNumbers: true
});

module.exports = db;