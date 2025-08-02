const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/errors.log');

exports.error = (msg) => {
  const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, logMsg);
};
