const express = require('express');
const router = express.Router();
const {
    submitMessage, getMyMessages, getMyMessage,
    getMessages, getMessage, postReply, markRead, deleteMessage
} = require('../controllers/contact.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Optional auth middleware — attaches req.user if token present, but doesn't block guests
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const { verifyToken } = require('../utils/jwt');
    try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        req.user = { id: decoded.userId, role: decoded.role, email: decoded.email };
    } catch (_) {}
    next();
};

// Public (with optional auth to link userId)
router.post('/', optionalAuth, submitMessage);

// Customer — view their own conversations
router.get('/my', authenticate, getMyMessages);
router.get('/my/:id', authenticate, getMyMessage);

// Admin / Employee
router.get('/', authenticate, authorize('ADMIN', 'EMPLOYEE'), getMessages);
router.get('/:id', authenticate, authorize('ADMIN', 'EMPLOYEE'), getMessage);
router.post('/:id/reply', authenticate, authorize('ADMIN', 'EMPLOYEE'), postReply);
router.patch('/:id/read', authenticate, authorize('ADMIN', 'EMPLOYEE'), markRead);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteMessage);

module.exports = router;
