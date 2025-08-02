const express = require('express');
const router = express.Router();
const authController = require('../controllers/user.controller');
const verifyToken = require('../middleware/auth.middleware');
const multer = require('multer');
const optionalAuth = require('../middleware/optionalAuth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for profile images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/user-type', authController.saveUserType);
router.post('/traveler-info', verifyToken, authController.saveTravelerInfo);
router.post('/requester-info', verifyToken, authController.saveRequesterInfo);
router.post('/match-travelers', optionalAuth, authController.getMatchedTravelers);
router.post('/match-requesters', optionalAuth, authController.getMatchedRequesters);
// router.get('/users', verifyToken, authController.getUserListWithLastMessage);
// router.post('/verify-pnr', authController.verifyPNRDetails);
// router.get('/generate-test-pnr', authController.generateTestPNR);

router.post('/send-request', verifyToken, authController.sendConnectionRequest);
router.post('/update-request', verifyToken, authController.updateConnectionRequest);
router.get('/requests', verifyToken, authController.getConnectionRequests);
router.post('/submit-review', verifyToken, authController.submitReview);
router.get('/get-profile', verifyToken, authController.getProfile);
router.post(
  '/update-profile',
  verifyToken,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  authController.updateProfile
);

module.exports = router;