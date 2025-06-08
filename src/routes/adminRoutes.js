const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../services/auth');
const {
  getAllUsers,
  toggleUserStatus,
  getAllDetections,
  getSystemStats
} = require('../controllers/adminController');

// Tüm admin route'ları auth ve admin yetkisi gerektirir
router.use(authenticateToken);
router.use(requireAdmin);

// Kullanıcı yönetimi
router.get('/users', getAllUsers);
router.put('/users/:userId/toggle-status', toggleUserStatus);

// Detection yönetimi
router.get('/detections', getAllDetections);

// Sistem istatistikleri
router.get('/stats', getSystemStats);

module.exports = router;
