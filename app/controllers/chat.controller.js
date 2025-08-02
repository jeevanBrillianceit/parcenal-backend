const dbHelper = require('../config/db.helper');
const response = require('../utils/response.helper');
const { getIO } = require('../middleware/socket');
const { uploadToS3 } = require('../utils/s3.helper');

exports.createOrGetThread = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = parseInt(req.params.userId);

    console.log(`Creating or getting thread between ${userId} and ${otherUserId}`);

    const params = [{ value: userId }, { value: otherUserId }];
    const result = await dbHelper.callStoredProcedure('CREATE_OR_GET_THREAD', params);

    if (!result[0] || !result[0][0]?.thread_id) {
      console.error('Failed to create or get thread');
      return response.errorHandler(res, null, 'Failed to create or get thread');
    }

    console.log(`Thread found/created: ${result[0][0].thread_id}`);
    return response.successHandler(res, { id: result[0][0].thread_id }, 'Thread fetched');
  } catch (err) {
    console.error('Error in createOrGetThread:', err);
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.sendMessage = async (req, res) => {
  try {
    // Add validation
    if (!req.body.threadId || !req.body.content) {
      return res.status(400).json({
        status: 0,
        message: 'Thread ID and content are required',
        errors: {
          threadId: !req.body.threadId ? 'Thread ID is required' : undefined,
          content: !req.body.content ? 'Content is required' : undefined
        }
      });
    }

    const { threadId, content, messageType = 'text', tempId } = req.body;

    const params = [
      { value: threadId },
      { value: req.user.id },
      { value: messageType },
      { value: content }
    ];

    const result = await dbHelper.callStoredProcedure('SEND_MESSAGE', params);
    
    if (!result[0] || !result[0][0]) {
      return res.status(500).json({
        status: 0,
        message: 'Failed to send message'
      });
    }

    const savedMessage = result[0][0];
    const io = getIO();

    const messageToEmit = {
      id: savedMessage.id,
      tempId,
      content: savedMessage.content,
      message_type: savedMessage.message_type,
      sender_id: savedMessage.sender_id,
      created_at: savedMessage.created_at,
      is_read: false,
      threadId: parseInt(threadId)
    };

    io.to(`thread-${threadId}`).emit('message', messageToEmit);
    
    return res.status(200).json({
      status: 1,
      data: messageToEmit,
      message: 'Message sent successfully'
    });
    
  } catch (err) {
    console.error('Error in sendMessage:', err);
    return res.status(500).json({
      status: 0,
      message: err.message || 'Internal server error'
    });
  }
};

exports.getMessagesByThread = async (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId);
    if (!threadId) return response.errorHandler(res, null, 'Thread ID is required');

    const params = [{ value: threadId }];
    const result = await dbHelper.callStoredProcedure('GET_CHAT_MESSAGES', params);

    return response.successHandler(res, result[0], 'Messages fetched');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.getUserListWithLastMessage = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const params = [
      { value: req.user.id },
      { value: parseInt(limit) },
      { value: parseInt(offset) }
    ];

    const result = await dbHelper.callStoredProcedure('GET_USER_LIST_WITH_LAST_MESSAGE', params);
    return response.successHandler(res, result[0], 'User list fetched');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.updateLastSeen = async (req, res) => {
  try {
    const params = [{ value: req.user.id }, { value: 1 }];
    await dbHelper.callStoredProcedure('UPDATE_LAST_SEEN', params);
    return response.successHandler(res, null, 'Last seen updated');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};

// In chat.controller.js, update uploadFile:
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return response.errorHandler(res, null, 'No file uploaded');
    
    // Upload to S3
    const fileUrl = await uploadToS3(req.file, 'chat_files_123');
    
    if (req.body.threadId) {
      const params = [
        { value: req.body.threadId },
        { value: req.user.id },
        { value: 'file' },
        { value: fileUrl }
      ];

      // Store in database
      const result = await dbHelper.callStoredProcedure('SEND_MESSAGE', params);
      
      if (!result[0] || !result[0][0]) {
        throw new Error('Failed to save file message to database');
      }

      const savedMessage = result[0][0];
      const io = getIO();
      
      const messageToEmit = {
        id: savedMessage.id,
        tempId: req.body.tempId,
        content: savedMessage.content,
        message_type: savedMessage.message_type,
        sender_id: savedMessage.sender_id,
        created_at: savedMessage.created_at,
        is_read: false,
        threadId: parseInt(req.body.threadId),
        fileInfo: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        }
      };
      
      io.to(`thread-${req.body.threadId}`).emit('message', messageToEmit);
    }

    return response.successHandler(res, { url: fileUrl }, 'File uploaded');
  } catch (err) {
    console.error('File upload error:', err);
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.getExistingThreads = async (req, res) => {
  try {
    const { userIds } = req.body;
    const currentUserId = req.user.id;

    // Validate input
    if (!userIds || !Array.isArray(userIds)) {
      return response.errorHandler(
        res, 
        null, 
        'userIds must be an array of user IDs',
        400
      );
    }

    // Filter out invalid user IDs
    const validUserIds = userIds
      .map(id => parseInt(id))
      .filter(id => !isNaN(id) && id !== currentUserId);

    if (validUserIds.length === 0) {
      return response.successHandler(
        res, 
        {}, 
        'No valid user IDs provided'
      );
    }

    const inputParams = [
      { value: currentUserId },
      { value: JSON.stringify(validUserIds) }
    ];

    // Call stored procedure
    const result = await dbHelper.callStoredProcedure(
      'GET_EXISTING_THREADS', 
      inputParams
    );

    // Format response
    const threadsMap = {};
    result[0].forEach(thread => {
      threadsMap[thread.other_user_id] = thread.threadId;
    });

    return response.successHandler(
      res,
      threadsMap,
      'Existing threads retrieved'
    );

  } catch (err) {
    console.error('Error in getExistingThreads:', err);
    return response.errorHandler(
      res,
      null,
      'Failed to retrieve threads',
      500
    );
  }
};