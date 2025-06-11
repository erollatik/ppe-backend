const axios = require('axios');

const CPP_BRIDGE_URL = 'http://localhost:8080';

// Mock data için global değişkenler
let mockMode = true;
let isMonitoring = false;
let mockDetections = [];
let mockInterval = null;
let mockStats = {
  totalDetections: 0,
  safeDetections: 0,
  violations: 0,
  complianceRate: 100,
  activeWorkers: 0
};

class PPEController {
    // PPE monitoring başlat
    async startMonitoring(req, res) {
        try {
            console.log('🎬 PPE Monitoring başlatma isteği alındı');
            
            if (mockMode) {
                if (!isMonitoring) {
                    isMonitoring = true;
                    this.startMockDetections();
                    
                    console.log('✅ PPE Monitoring başlatıldı (Mock Mode)');
                    res.json({
                        success: true,
                        message: 'PPE monitoring başlatıldı (Test Modu)',
                        data: { status: 'running', mode: 'mock' }
                    });
                } else {
                    res.json({
                        success: false,
                        message: 'Monitoring zaten çalışıyor',
                        data: { status: 'already_running' }
                    });
                }
                return;
            }

            // Gerçek C++ bridge denemesi
            const response = await axios.post(`${CPP_BRIDGE_URL}/ppe/start`);
            isMonitoring = true;
            
            res.json({
                success: true,
                message: 'PPE monitoring başlatıldı',
                data: response.data
            });
        } catch (error) {
            console.error('❌ PPE monitoring başlatma hatası:', error.message);
            
            // C++ bridge yoksa mock mode'a geç
            if (!mockMode) {
                console.log('🔄 Mock mode\'a geçiliyor...');
                mockMode = true;
                return this.startMonitoring(req, res);
            }
            
            res.status(500).json({
                success: false,
                message: 'PPE monitoring başlatılamadı',
                error: error.message
            });
        }
    }
    
    // Diğer metodlar aynı kalacak...
    async stopMonitoring(req, res) {
        try {
            console.log('⏹️ PPE Monitoring durdurma isteği alındı');
            isMonitoring = false;
            
            if (mockMode) {
                if (mockInterval) {
                    clearInterval(mockInterval);
                    mockInterval = null;
                }
                mockDetections = [];
                
                console.log('✅ PPE Monitoring durduruldu (Mock Mode)');
                res.json({
                    success: true,
                    message: 'PPE monitoring durduruldu (Test Modu)',
                    data: { status: 'stopped', mode: 'mock' }
                });
                return;
            }

            const response = await axios.post(`${CPP_BRIDGE_URL}/ppe/stop`);
            res.json({
                success: true,
                message: 'PPE monitoring durduruldu',
                data: response.data
            });
        } catch (error) {
            isMonitoring = false;
            if (mockInterval) {
                clearInterval(mockInterval);
                mockInterval = null;
            }
            
            res.json({
                success: true,
                message: 'Monitoring durduruldu (zorla)',
                data: { status: 'stopped' }
            });
        }
    }
    
    // Diğer metodları aynı tut...
    async getDetections(req, res) {
        try {
            if (mockMode) {
                res.json({
                    success: true,
                    data: {
                        detections: mockDetections.slice(-10),
                        isMonitoring,
                        mode: 'mock',
                        timestamp: Date.now()
                    }
                });
                return;
            }

            const response = await axios.get(`${CPP_BRIDGE_URL}/ppe/detections`);
            res.json({
                success: true,
                data: response.data
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    detections: mockDetections.slice(-10),
                    isMonitoring,
                    mode: 'fallback',
                    error: 'C++ bridge unavailable'
                }
            });
        }
    }
    
    async getStats(req, res) {
        try {
            if (mockMode) {
                res.json({
                    success: true,
                    data: {
                        stats: mockStats,
                        isMonitoring,
                        mode: 'mock',
                        timestamp: Date.now()
                    }
                });
                return;
            }

            const response = await axios.get(`${CPP_BRIDGE_URL}/ppe/stats`);
            res.json({
                success: true,
                data: response.data
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    stats: mockStats,
                    isMonitoring,
                    mode: 'fallback',
                    error: 'C++ bridge unavailable'
                }
            });
        }
    }
    
    async getCameraStream(req, res) {
        try {
            if (mockMode) {
                res.json({
                    success: true,
                    data: {
                        stream: {
                            url: 'mock://camera/stream',
                            status: isMonitoring ? 'active' : 'inactive',
                            mode: 'mock',
                            fps: 30,
                            resolution: '1920x1080'
                        }
                    }
                });
                return;
            }

            const response = await axios.get(`${CPP_BRIDGE_URL}/camera/stream`, {
                responseType: 'stream'
            });
            
            res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
            response.data.pipe(res);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Kamera stream alınamadı',
                error: error.message
            });
        }
    }

    // Mock detection generator
    startMockDetections() {
        console.log('🎭 Mock detection başlatılıyor...');
        
        mockInterval = setInterval(() => {
            if (!isMonitoring) {
                clearInterval(mockInterval);
                mockInterval = null;
                return;
            }
            
            const detection = {
                id: Date.now(),
                track_id: Math.floor(Math.random() * 100),
                has_helmet: Math.random() > 0.3,
                confidence: (0.8 + Math.random() * 0.2).toFixed(2),
                bbox: {
                    x: Math.floor(Math.random() * 400),
                    y: Math.floor(Math.random() * 300),
                    width: 100 + Math.floor(Math.random() * 100),
                    height: 120 + Math.floor(Math.random() * 80)
                },
                timestamp: Date.now(),
                worker_id: `W${Math.floor(Math.random() * 50) + 1}`,
                location: `Saha-${Math.floor(Math.random() * 5) + 1}`
            };
            
            mockDetections.push(detection);
            if (mockDetections.length > 100) {
                mockDetections.shift();
            }
            
            this.updateMockStats(detection);
            
            console.log(`📊 Mock tespit: ID:${detection.track_id}, Baret:${detection.has_helmet ? '✅' : '❌'}, Güven:${detection.confidence}`);
            
        }, 2000);
    }

    updateMockStats(detection) {
        mockStats.totalDetections++;
        
        if (detection.has_helmet) {
            mockStats.safeDetections++;
        } else {
            mockStats.violations++;
        }
        
        mockStats.complianceRate = Math.round(
            (mockStats.safeDetections / mockStats.totalDetections) * 100
        );
        
        mockStats.activeWorkers = Math.min(15, Math.ceil(mockStats.totalDetections / 3));
    }

    async checkCppBridge() {
        try {
            await axios.get(`${CPP_BRIDGE_URL}/health`);
            mockMode = false;
            console.log('✅ C++ Bridge aktif, gerçek mod kullanılıyor');
        } catch (error) {
            mockMode = true;
            console.log('🎭 C++ Bridge bulunamadı, mock mod kullanılıyor');
        }
    }
}

const ppeController = new PPEController();
ppeController.checkCppBridge();

// ✅ EXPORT DÜZELTMESI - METODLARI BIND ET
module.exports = {
    startMonitoring: (req, res) => ppeController.startMonitoring(req, res),
    stopMonitoring: (req, res) => ppeController.stopMonitoring(req, res),
    getDetections: (req, res) => ppeController.getDetections(req, res),
    getStats: (req, res) => ppeController.getStats(req, res),
    getCameraStream: (req, res) => ppeController.getCameraStream(req, res)
};
