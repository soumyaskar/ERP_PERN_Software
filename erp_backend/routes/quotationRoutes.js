const express = require('express');
const router = express.Router();
const { 
    createQuotation, 
    getQuotations, 
    getQuotationById, 
    updateQuotationStatus, 
    convertQuotationToOrder 
} = require('../controllers/quotationController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorizeRoles('ADMIN', 'SALES'), createQuotation);
router.get('/', verifyToken, getQuotations);
router.get('/:id', verifyToken, getQuotationById);
router.patch('/:id/status', verifyToken, authorizeRoles('ADMIN', 'SALES'), updateQuotationStatus);
router.post('/:id/convert', verifyToken, authorizeRoles('ADMIN', 'SALES'), convertQuotationToOrder);

module.exports = router;