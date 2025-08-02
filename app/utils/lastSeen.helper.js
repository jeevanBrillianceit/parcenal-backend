const dbHelper = require('../config/db.helper');

exports.updateLastSeenTimestamp = async (userId, isOnline) => {
  try {
    const params = [
      { value: userId },
      { value: isOnline ? 1 : 0 }
    ];
    await dbHelper.callStoredProcedure('UPDATE_LAST_SEEN', params);
  } catch (err) {
    console.error('Error updating last seen:', err.message || err);
  }
};
