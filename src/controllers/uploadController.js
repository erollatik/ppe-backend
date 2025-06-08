const { Detection, DetectionResult } = require('../models/database');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Dosya yüklenmedi'
      });
    }

    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    // Veritabanına kaydet
    const detection = await Detection.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: fileType,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'pending',
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Dosya başarıyla yüklendi',
      data: {
        detectionId: detection.id,
        filename: detection.filename,
        originalName: detection.originalName,
        fileType: detection.fileType,
        fileSize: detection.fileSize,
        status: detection.status
      }
    });

    // Arka planda PPE detection başlat
    processDetection(detection.id);

  } catch (error) {
    console.error('Upload hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error.message
    });
  }
};

const processDetection = async (detectionId) => {
  try {
    const detection = await Detection.findByPk(detectionId);
    if (!detection) return;

    // Status'u processing yap
    await detection.update({ status: 'processing' });

    const startTime = Date.now();
    
    // C++ uygulamasını çalıştır (şimdilik mock data)
    // Gerçek implementasyonda C++ app çalıştırılacak
    
    // Mock detection results
    setTimeout(async () => {
      try {
        const processingTime = (Date.now() - startTime) / 1000;
        
        // Mock sonuçlar
        const mockResults = [
          {
            objectType: 'person',
            confidence: 0.95,
            boundingBox: { x: 100, y: 50, width: 200, height: 300 },
            hasViolation: true,
            violationType: 'no_helmet'
          },
          {
            objectType: 'helmet',
            confidence: 0.85,
            boundingBox: { x: 120, y: 30, width: 80, height: 60 },
            hasViolation: false,
            violationType: null
          }
        ];

        // Sonuçları kaydet
        for (const result of mockResults) {
          await DetectionResult.create({
            detectionId: detectionId,
            ...result
          });
        }

        // Detection'ı tamamlandı olarak işaretle
        await detection.update({ 
          status: 'completed',
          processingTime: processingTime
        });

        console.log(`✅ Detection ${detectionId} tamamlandı (${processingTime}s)`);
        
      } catch (error) {
        console.error('Detection processing hatası:', error);
        await detection.update({ status: 'failed' });
      }
    }, 3000); // 3 saniye mock processing time

  } catch (error) {
    console.error('Process detection hatası:', error);
  }
};

const getDetectionStatus = async (req, res) => {
  try {
    const { detectionId } = req.params;
    
    const detection = await Detection.findOne({
      where: { 
        id: detectionId,
        userId: req.user.id 
      },
      include: [DetectionResult]
    });

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection bulunamadı'
      });
    }

    res.json({
      success: true,
      data: detection
    });

  } catch (error) {
    console.error('Get detection status hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Durum kontrolü hatası',
      error: error.message
    });
  }
};

const getUserDetections = async (req, res) => {
  try {
    const detections = await Detection.findAll({
      where: { userId: req.user.id },
      include: [DetectionResult],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: detections
    });

  } catch (error) {
    console.error('Get user detections hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Detection listesi alınamadı',
      error: error.message
    });
  }
};

module.exports = {
  uploadFile,
  getDetectionStatus,
  getUserDetections
};
