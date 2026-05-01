const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for efficient database access
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'garage_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection on startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL connected successfully to database:', process.env.DB_NAME || 'garage_db');
        connection.release();
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        console.error('   Make sure MySQL is running and your .env credentials are correct.');
        console.error('   Also ensure you have run schema.sql to create the database.');
    }
}

module.exports = { pool, testConnection };
