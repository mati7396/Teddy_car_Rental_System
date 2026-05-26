const express = require('express');
const router = express.Router();
const carController = require('../controllers/car.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Public routes (for customers browsing)
/*Get all cars – View a list of available cars.
Get a specific car – View details of a particular car.*/
router.get('/', carController.getAllCars);
router.get('/:id', carController.getCarById);

// Staff/Admin routes
/*Create a car – Add a new car to the system.
Update a car – Modify car details (can use PUT or PATCH).
Delete a car – Remove a car (only admins can fully delete).*/
router.post('/', authenticate, authorize('EMPLOYEE', 'ADMIN'), carController.createCar);
router.put('/:id', authenticate, authorize('EMPLOYEE', 'ADMIN'), carController.updateCar);
router.patch('/:id', authenticate, authorize('EMPLOYEE', 'ADMIN'), carController.updateCar);
router.post('/:id/release', authenticate, authorize('EMPLOYEE', 'ADMIN'), carController.releaseFromMaintenance);
router.delete('/:id', authenticate, authorize('ADMIN'), carController.deleteCar);

module.exports = router;
