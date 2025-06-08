const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../services/auth');
const { 
  uploadFile, 
  getDetectionStatus, 
  getUserDetections 
} = require('../controllers/uploadController');

// Dosya yükleme
router.post('/upload', authenticateToken, upload.single('file'), uploadFile);

// Detection durumu sorgulama
router.get('/detection/:detectionId', authenticateToken, getDetectionStatus);

// Kullanıcının tüm detection'larını getir
router.get('/detections', authenticateToken, getUserDetections);

module.exports = router;
