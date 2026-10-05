const express = require('express');
const router = express.Router();
const { createSalesOrder, confirmOrder, getOrders } = require('../controllers/salesOrderController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorizeRoles('ADMIN', 'SALES'), createSalesOrder);
router.put('/:id/confirm', verifyToken, authorizeRoles('ADMIN'), confirmOrder);
router.get('/', verifyToken, getOrders); // ADDED THIS LINE

module.exports = router;