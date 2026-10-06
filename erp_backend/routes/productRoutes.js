const express = require('express');
const router = express.Router();
const { getProducts, createProduct } = require('../controllers/productController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, createProduct);

module.exports = router;
