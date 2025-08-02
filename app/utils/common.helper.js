exports.generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.isEmpty = obj => !obj || Object.keys(obj).length === 0;

exports.sanitizeInput = str =>
  typeof str === 'string' ? str.replace(/[<>]/g, '') : str;

exports.formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toISOString().split('T')[0]; // returns YYYY-MM-DD
};

exports.formatTime = (isoString) => {
  const date = new Date(isoString);
  return date.toISOString().split('T')[1].split('.')[0]; // returns HH:MM:SS
};
