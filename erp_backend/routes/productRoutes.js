const express = require('express');
const router = express.Router();
const { getProducts, createProduct } = require('../controllers/productController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, authorizeRoles('ADMIN'), createProduct);

module.exports = router;
