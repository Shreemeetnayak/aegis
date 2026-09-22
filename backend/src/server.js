require('dotenv').config();
const { createApp } = require('./app');
const { initializeDatabase } = require('./database/db');

const PORT = Number(process.env.PORT) || 5000;

function start() {
  initializeDatabase();
  const app = createApp();
  return app.listen(PORT, () => {
    console.log(`Aegis API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

if (require.main === module) start();

module.exports = { start };
