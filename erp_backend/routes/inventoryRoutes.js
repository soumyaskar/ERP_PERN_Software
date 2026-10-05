const express = require('express');
const router = express.Router();
const { getInventory, updateInventory } = require('../controllers/productController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getInventory);
router.patch('/:productId', verifyToken, authorizeRoles('ADMIN'), updateInventory);

module.exports = router;
