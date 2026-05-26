const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Customer routes
/*Create a booking – Allows a logged-in user to make a new booking.
View my bookings – Retrieve all bookings made by the logged-in user.
View a specific booking – Get details of one booking belonging to the user.
Update a booking – Modify a booking if the user is the owner.*/
router.post('/', authenticate, bookingController.createBooking);
router.post('/payments/chapa/initialize', authenticate, bookingController.initializeChapaPayment);
router.get('/payments/chapa/verify', authenticate, bookingController.verifyChapaPayment);
router.get('/my', authenticate, bookingController.getMyBookings);
router.get('/:id/cancellation-preview', authenticate, bookingController.getCancellationPreview);
router.get('/:id', authenticate, bookingController.getBookingById);
router.patch('/:id', authenticate, bookingController.updateBooking);
router.patch('/:id/cancel', authenticate, bookingController.cancelBooking);
router.delete('/:id', authenticate, bookingController.deleteMyBooking);

// Employee/Admin routes
/*View all bookings – Staff can see all bookings in the system.
Update booking status – Staff can change the status of a booking (e.g., ACTIVE, COMPLETED).
Assign driver – Staff can assign a driver to a booking.*/
router.get('/', authenticate, authorize('EMPLOYEE', 'ADMIN'), bookingController.getAllBookings);
router.patch('/:id/status', authenticate, authorize('EMPLOYEE', 'ADMIN'), bookingController.updateBookingStatus);
router.patch('/:id/assign-driver', authenticate, authorize('EMPLOYEE', 'ADMIN'), bookingController.assignDriver);
router.get('/drivers/available', authenticate, authorize('EMPLOYEE', 'ADMIN'), bookingController.getAvailableDrivers);

module.exports = router;
