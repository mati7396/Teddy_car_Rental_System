/*Register a user – Create a new account.
Login a user – Authenticate and issue access (like a token).
Logout a user – End the user session.
Get user profile – Retrieve the current logged-in user’s information.
Update user profile – Modify the current user’s information.*/
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);


module.exports = router;
