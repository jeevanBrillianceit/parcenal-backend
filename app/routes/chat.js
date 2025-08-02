const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatController = require('../controllers/chat.controller');
const verifyToken = require('../middleware/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and common document types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

router.post('/upload', verifyToken, upload.single('file'), chatController.uploadFile);

// Existing routes
router.get('/thread/:userId', verifyToken, chatController.createOrGetThread);
router.post('/send', verifyToken, chatController.sendMessage);
router.get('/messages/:threadId', verifyToken, chatController.getMessagesByThread);
router.get('/user-list', verifyToken, chatController.getUserListWithLastMessage);
router.post('/last-seen', verifyToken, chatController.updateLastSeen);
router.post('/get-threads', verifyToken, chatController.getExistingThreads);

module.exports = router;
