const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Public routes
router.post('/login', driverController.login);

// Driver only routes
router.get('/profile', authenticate, authorize('DRIVER'), driverController.getProfile);
router.put('/profile', authenticate, authorize('DRIVER'), driverController.updateProfile);
router.put('/change-password', authenticate, authorize('DRIVER'), driverController.changePassword);
router.get('/deliveries', authenticate, authorize('DRIVER'), driverController.getAssignedDeliveries);
router.put('/deliveries/:id/status', authenticate, authorize('DRIVER'), driverController.updateDeliveryStatus);

// Admin only routes
router.post('/admin/create', authenticate, authorize('ADMIN'), driverController.adminCreateDriver);
router.get('/admin/all', authenticate, authorize('ADMIN', 'EMPLOYEE'), driverController.getAllDrivers);
router.put('/admin/:id', authenticate, authorize('ADMIN'), driverController.adminUpdateDriver);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), driverController.deleteDriver);

module.exports = router;
