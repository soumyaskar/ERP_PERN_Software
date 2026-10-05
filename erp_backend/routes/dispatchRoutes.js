const express = require('express');
const router = express.Router();
const { createDispatch, getDispatches } = require('../controllers/dispatchController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Only ADMIN can dispatch goods from the warehouse
router.post('/', verifyToken, authorizeRoles('ADMIN'), createDispatch);
router.get('/', verifyToken, authorizeRoles('ADMIN', 'SALES'), getDispatches);

module.exports = router;