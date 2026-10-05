const jwt = require('jsonwebtoken');

// 1. Verify if the user has a valid token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Expects "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach the user payload (id, role) to the request
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// 2. Check if the user has the correct role
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden. You do not have permission.' });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRoles };