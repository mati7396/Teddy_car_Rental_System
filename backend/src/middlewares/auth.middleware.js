const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prismaClient');
//authenticate → Ensures the user is logged in and valid.
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        let user;
        if (decoded.role === 'DRIVER') {
            user = await prisma.driver.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true }
            });
            if (user) user.role = 'DRIVER';
        } else {
            user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, role: true }
            });
        }

        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.warn(`Auth middleware: Token expired at ${error.expiredAt}`);
        } else {
            console.error('Auth middleware error:', error);
        }
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
//authorize → Ensures the user has permission to perform the action based on their role.
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action' });
        }
        next();
    };
};

module.exports = {
    authenticate,
    authorize
};
