const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Please add it to your .env file.');
    process.exit(1);
}

const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, JWT_SECRET, {
        expiresIn: '1d',
    });
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken,
};
