const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Restricted to Staff and Admin
/*/financials – Get an overview of the business’s financial metrics (revenue, expenses, net profit, etc.).
/transactions – Get a list of recent payment transactions.*/
router.get('/financials', authenticate, authorize('ADMIN', 'EMPLOYEE'), reportController.getFinancialOverview);
router.get('/transactions', authenticate, authorize('ADMIN', 'EMPLOYEE'), reportController.getRecentTransactions);
router.get('/receipts', authenticate, authorize('ADMIN', 'EMPLOYEE'), reportController.getReceipts);
router.get('/chart-data', authenticate, authorize('ADMIN', 'EMPLOYEE'), reportController.getChartData);
router.get('/notifications', authenticate, authorize('ADMIN', 'EMPLOYEE'), reportController.getNotifications);
router.get('/my-notifications', authenticate, reportController.getMyNotifications);
router.patch('/notifications/:id/read', authenticate, reportController.markNotificationRead);

module.exports = router;
