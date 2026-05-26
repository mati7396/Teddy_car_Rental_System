const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/local-bank/account', authenticate, paymentController.getLocalBankAccount);
router.post('/local-bank/pay', authenticate, paymentController.payWithLocalBank);
router.get('/local-bank/transactions', authenticate, paymentController.getLocalBankTransactions);
router.get('/local-bank/transactions/:id', authenticate, paymentController.getLocalBankTransactionById);
router.get('/local-bank/payments/:bookingId', authenticate, paymentController.getPaymentByBooking);

module.exports = router;
