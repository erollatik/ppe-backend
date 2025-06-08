const express = require('express');
const ppeController = require('../controllers/ppeController');
const router = express.Router();

// PPE monitoring routes
router.post('/start', ppeController.startMonitoring);
router.post('/stop', ppeController.stopMonitoring);
router.get('/detections', ppeController.getDetections);
router.get('/stats', ppeController.getStats);
router.get('/camera/stream', ppeController.getCameraStream);

module.exports = router;
