const express = require('express');
const router = express.Router();
const { createQuotation, getQuotations } = require('../controllers/quotationController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorizeRoles('ADMIN', 'SALES'), createQuotation);
router.get('/', verifyToken, getQuotations);

module.exports = router;