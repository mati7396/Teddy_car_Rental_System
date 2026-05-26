const express = require('express');
const router = express.Router();
const tracking = require('../controllers/tracking.controller');

// POST /api/tracking/simulate
router.post('/simulate', tracking.postSimulate);

// GET /api/tracking/latest/:vehicleId
router.get('/latest/:vehicleId', tracking.getLatest);

// GET /api/tracking/active-vehicles
router.get('/active-vehicles', tracking.getActiveVehicles);

// GET /api/tracking/stream  (SSE)
router.get('/stream', tracking.stream);

module.exports = router;
