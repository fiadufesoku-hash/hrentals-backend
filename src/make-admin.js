// CORRECTED update-role-12.js
const mysql = require('mysql2');

console.log('Updating ID 12 to admin...');

const conn = mysql.createConnection({
  host: 'shinkansen.proxy.rlwy.net',
  port: 20778,
  user: 'root',
  password: 'RQIBwhDKnsiHOJPxbwFtdYCfRAnUZRRW',
  database: 'railway'
});

// Use backticks `User` not quotes 'User'
conn.query(
  "UPDATE `User` SET role = 'admin' WHERE id = 12",
  (err, result) => {
    if (err) {
      console.error('❌ Error:', err.message);
      
      // Try lowercase
      conn.query(
        "UPDATE `user` SET role = 'admin' WHERE id = 12",
        (err2, result2) => {
          if (err2) {
            console.error('❌ Also failed with lowercase:', err2.message);
            
            // List all tables to see what exists
            conn.query('SHOW TABLES', (tablesErr, tables) => {
              console.log('📊 Available tables:', tables);
              conn.end();
            });
          } else {
            console.log(`✅ Updated with lowercase: ${result2.affectedRows} user(s)`);
            conn.end();
          }
        }
      );
    } else {
      console.log(`✅ Updated ${result.affectedRows} user(s) with uppercase`);
      conn.end();
    }
  }
);