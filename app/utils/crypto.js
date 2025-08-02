const crypto = require('crypto');
const KEY = Buffer.from(process.env.CHAT_KEY, 'hex');
const IV = Buffer.from(process.env.CHAT_IV, 'hex');

module.exports = {
  encrypt: (text) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    return enc;
  },
  decrypt: (hash) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
    let dec = decipher.update(hash, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }
};