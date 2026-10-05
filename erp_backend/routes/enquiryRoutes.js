const express = require('express');
const router = express.Router();
const { createEnquiry, getEnquiries } = require('../controllers/enquiryController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorizeRoles('ADMIN', 'SALES'), createEnquiry);
router.get('/', verifyToken, getEnquiries);

module.exports = router;