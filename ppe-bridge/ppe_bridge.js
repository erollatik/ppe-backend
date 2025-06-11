const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer ayarları - görüntü upload için
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// C++ executable path
const CPP_EXECUTABLE = '/Users/erolatik/tez/tez-ppe/build/ppe_bridge';

// PPE Detection endpoint
app.post('/api/detect-ppe', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Görüntü bulunamadı' });
        }

        // Geçici dosya oluştur
        const tempImagePath = path.join(__dirname, 'temp_image.jpg');
        fs.writeFileSync(tempImagePath, req.file.buffer);

        // C++ uygulamasını çalıştır
        const cppProcess = spawn(CPP_EXECUTABLE, [
            '--input', tempImagePath,
            '--output', path.join(__dirname, 'output.json'),
            '--mode', 'api'
        ]);

        let result = '';
        let error = '';

        cppProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        cppProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        cppProcess.on('close', (code) => {
            // Geçici dosyayı temizle
            if (fs.existsSync(tempImagePath)) {
                fs.unlinkSync(tempImagePath);
            }

            if (code === 0) {
                try {
                    const detectionResult = JSON.parse(result);
                    res.json({
                        success: true,
                        detections: detectionResult.detections || [],
                        timestamp: new Date().toISOString(),
                        processingTime: detectionResult.processingTime || 0
                    });
                } catch (parseError) {
                    res.status(500).json({ 
                        error: 'Sonuç parse edilemedi',
                        details: parseError.message 
                    });
                }
            } else {
                res.status(500).json({ 
                    error: 'PPE detection başarısız',
                    details: error 
                });
            }
        });

    } catch (error) {
        console.error('PPE Detection Error:', error);
        res.status(500).json({ 
            error: 'Sunucu hatası',
            details: error.message 
        });
    }
});

// Stream endpoint - gerçek zamanlı için
app.post('/api/stream-detect', express.raw({ type: 'image/*', limit: '10mb' }), async (req, res) => {
    try {
        // Base64 görüntüyü işle
        const imageBuffer = req.body;
        const tempImagePath = path.join(__dirname, `stream_${Date.now()}.jpg`);
        
        fs.writeFileSync(tempImagePath, imageBuffer);

        // Hızlı detection için
        const cppProcess = spawn(CPP_EXECUTABLE, [
            '--input', tempImagePath,
            '--mode', 'stream',
            '--confidence', '0.5'
        ]);

        let result = '';
        cppProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        cppProcess.on('close', (code) => {
            fs.unlinkSync(tempImagePath);
            
            if (code === 0) {
                try {
                    const detectionResult = JSON.parse(result);
                    res.json(detectionResult);
                } catch (e) {
                    res.json({ detections: [], error: 'Parse error' });
                }
            } else {
                res.json({ detections: [], error: 'Detection failed' });
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        cppExecutable: fs.existsSync(CPP_EXECUTABLE)
    });
});

app.get('/api/detection', (req, res) => {
    res.json({ 
        status: 'ready',
        message: 'PPE Detection service is running',
        timestamp: new Date().toISOString()
    });
});

// Detect endpoint (frontend'in detectPPE() için)
app.post('/api/detect', express.json(), async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'Image data required' });
        }

        // Base64 image'ı buffer'a çevir
        const imageBuffer = Buffer.from(image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
        const tempImagePath = path.join(__dirname, `detect_${Date.now()}.jpg`);
        
        fs.writeFileSync(tempImagePath, imageBuffer);

        // C++ detection çalıştır
        const cppProcess = spawn(CPP_EXECUTABLE, [
            '--input', tempImagePath,
            '--mode', 'api',
            '--confidence', '0.5'
        ]);

        let result = '';
        let error = '';

        cppProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        cppProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        cppProcess.on('close', (code) => {
            // Temp dosyayı temizle
            if (fs.existsSync(tempImagePath)) {
                fs.unlinkSync(tempImagePath);
            }

            if (code === 0) {
                try {
                    const detectionResult = JSON.parse(result);
                    res.json({
                        success: true,
                        detections: detectionResult.detections || [],
                        timestamp: new Date().toISOString()
                    });
                } catch (parseError) {
                    res.status(500).json({ 
                        error: 'Parse error',
                        details: parseError.message 
                    });
                }
            } else {
                res.status(500).json({ 
                    error: 'Detection failed',
                    details: error 
                });
            }
        });

    } catch (error) {
        res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

// Upload endpoint (frontend'in uploadImageForDetection() için)
app.post('/api/detect/upload', upload.single('image'), async (req, res) => {
    // Mevcut /api/detect-ppe endpoint'ini kullan
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const tempImagePath = path.join(__dirname, `upload_${Date.now()}.jpg`);
        fs.writeFileSync(tempImagePath, req.file.buffer);

        const cppProcess = spawn(CPP_EXECUTABLE, [
            '--input', tempImagePath,
            '--mode', 'api'
        ]);

        let result = '';
        cppProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        cppProcess.on('close', (code) => {
            fs.unlinkSync(tempImagePath);
            
            if (code === 0) {
                try {
                    const detectionResult = JSON.parse(result);
                    res.json({
                        success: true,
                        detections: detectionResult.detections || []
                    });
                } catch (e) {
                    res.status(500).json({ error: 'Parse error' });
                }
            } else {
                res.status(500).json({ error: 'Detection failed' });
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 PPE Bridge Server running on port ${PORT}`);
    console.log(`📁 C++ Executable: ${CPP_EXECUTABLE}`);
});
