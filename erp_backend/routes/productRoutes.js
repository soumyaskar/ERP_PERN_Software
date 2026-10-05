const express = require('express');
const router = express.Router();
const { getProducts } = require('../controllers/productController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getProducts);

module.exports = router;
