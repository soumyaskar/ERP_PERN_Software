const express = require('express');
const router = express.Router();
const { getDispatches } = require('../controllers/dispatchController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', verifyToken, authorizeRoles('ADMIN', 'SALES'), getDispatches);

module.exports = router;