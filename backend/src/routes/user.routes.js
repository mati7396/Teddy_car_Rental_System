const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Admin only routes
router.get('/', authenticate, authorize('ADMIN', 'EMPLOYEE'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('ADMIN', 'EMPLOYEE'), userController.getUserById);
router.patch('/:id/role', authenticate, authorize('ADMIN'), userController.updateUserRole);
router.patch('/:id/reactivate', authenticate, authorize('ADMIN'), userController.reactivateUser);
router.put('/:id', authenticate, authorize('ADMIN'), userController.adminUpdateUser);
router.delete('/:id', authenticate, authorize('ADMIN', 'EMPLOYEE'), userController.deleteUser);
router.delete('/:id/permanent', authenticate, authorize('ADMIN'), userController.permanentlyDeleteUser);


module.exports = router;
