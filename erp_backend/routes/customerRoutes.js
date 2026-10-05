const express = require('express');
const router = express.Router();
const { createCustomer, getCustomers } = require('../controllers/customerController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Both ADMIN and SALES can manage customers
router.post('/', verifyToken, authorizeRoles('ADMIN', 'SALES'), createCustomer);
router.get('/', verifyToken, getCustomers);

module.exports = router;