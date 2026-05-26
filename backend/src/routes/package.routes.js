const express = require('express');
const router = express.Router();
const packageController = require('../controllers/package.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Public routes
/*Get all packages – View a list of all active packages.*/
router.get('/', packageController.getAllPackages);

// Admin only routes
/*Create a package – Add a new package to the system.
Update a package – Modify details of an existing package.
Delete a package – Deactivate or remove a package.*/
router.post('/', authenticate, authorize('ADMIN'), packageController.createPackage);
router.patch('/:id', authenticate, authorize('ADMIN'), packageController.updatePackage);
router.delete('/:id', authenticate, authorize('ADMIN'), packageController.deletePackage);

module.exports = router;
