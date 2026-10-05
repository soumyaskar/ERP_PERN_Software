const express = require('express');
const router = express.Router();
const { 
    getOrders, 
    getOrderById, 
    confirmOrder, 
    dispatchOrder, 
    cancelOrder 
} = require('../controllers/salesOrderController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrderById);
router.post('/:id/confirm', verifyToken, authorizeRoles('ADMIN'), confirmOrder);
router.post('/:id/dispatch', verifyToken, authorizeRoles('ADMIN'), dispatchOrder);
router.post('/:id/cancel', verifyToken, authorizeRoles('ADMIN', 'SALES'), cancelOrder);

module.exports = router;