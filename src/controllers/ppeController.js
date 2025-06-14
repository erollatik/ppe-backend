const axios = require('axios');

const CPP_BRIDGE_URL = 'http://localhost:8080';
const cppBridge = require('../cpp-bridge/cppBridge');


// ✨ YENİ: Basit kamera desteği
let NodeWebcam = null;
try {
    NodeWebcam = require('node-webcam');
    console.log('✅ node-webcam yüklendi - Kamera kullanılabilir');
} catch (error) {
    console.log('⚠️ node-webcam yüklenemedi - Sadık mock mode kullanılabilir');
}

// Global değişkenler
let mockMode = true;
let realCameraMode = false;
let isMonitoring = false;
let mockDetections = [];
let mockInterval = null;
let cameraInterval = null;
let currentFrame = null;
let mockStats = {
    totalDetections: 0,
    safeDetections: 0,
    violations: 0,
    complianceRate: 100,
    activeWorkers: 0
};

// ✨ YENİ: Kamera ayarları
let webcamOptions = {
    width: 640,
    height: 480,
    quality: 100,
    delay: 0,
    saveShots: false,
    output: "jpeg",
    device: false,
    callbackReturn: "base64",
    verbose: false
};

let Webcam = null;

class PPEController {
    // ✨ YENİ: Basit kamera başlatma
    async initializeSimpleCamera() {
        if (!NodeWebcam) {
            throw new Error('node-webcam yüklü değil');
        }

        try {
            console.log('📷 Basit kamera başlatılıyor...');
            Webcam = NodeWebcam.create(webcamOptions);
            console.log('✅ Basit kamera hazır');
            return true;
        } catch (error) {
            console.error('❌ Basit kamera başlatma hatası:', error);
            throw error;
        }
    }

    // ✨ YENİ: Kamera snapshot döngüsü
    startSimpleCameraLoop() {
        if (!NodeWebcam || !Webcam) return;

        const captureFrame = () => {
            if (!isMonitoring || !realCameraMode) {
                return;
            }

            try {
                Webcam.capture("temp_frame", (err, data) => {
                    if (err) {
                        console.error('❌ Frame yakalama hatası:', err);
                        return;
                    }

                    // Base64 frame'i işle
                    const frameDataUrl = `data:image/jpeg;base64,${data}`;
                    
                    // Mock tespitler ekle (görsel üzerine çizim yapamıyoruz ama tespit simüle edebiliriz)
                    const detections = this.generateMockDetections();
                    
                    // Frame'i kaydet
                    currentFrame = frameDataUrl;
                    
                    // Tespitleri kaydet
                    if (detections.length > 0) {
                        mockDetections.push(...detections);
                        if (mockDetections.length > 100) {
                            mockDetections = mockDetections.slice(-100);
                        }
                        this.updateStatsFromDetections(detections);
                    }
                });
            } catch (error) {
                console.error('❌ Kamera döngüsü hatası:', error);
            }
        };

        // Her 2 saniyede bir frame yakala
        cameraInterval = setInterval(captureFrame, 2000);
        console.log('🔄 Kamera döngüsü başlatıldı');
    }

    // ✨ YENİ: Mock tespit üretimi
    generateMockDetections() {
        const detections = [];
        const numPeople = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numPeople; i++) {
            const hasHelmet = Math.random() > 0.34;
            
            detections.push({
                id: `person_${i}_${Date.now()}`,
                track_id: Math.floor(Math.random() * 90) + 10,
                has_helmet: hasHelmet,
                confidence: (Math.random() * 0.25 + 0.7).toFixed(2),
                bbox: {
                    x: Math.floor(Math.random() * 400),
                    y: Math.floor(Math.random() * 300),
                    width: 100 + Math.floor(Math.random() * 100),
                    height: 120 + Math.floor(Math.random() * 80)
                },
                timestamp: Date.now(),
                worker_id: `W${Math.floor(Math.random() * 50) + 1}`,
                location: `Saha-${Math.floor(Math.random() * 5) + 1}`
            });
        }
        
        return detections;
    }

    // ✨ GÜNCELLENMIŞ: PPE monitoring başlat
    async startMonitoring(req, res) {
        try {
            console.log('🎬 PPE Monitoring başlatma isteği alındı');
            
            // Basit kamera modunu dene
            if (NodeWebcam && !realCameraMode) {
                try {
                    await this.initializeSimpleCamera();
                    realCameraMode = true;
                    mockMode = false;
                    console.log('✅ Basit kamera modu aktif');
                } catch (error) {
                    console.log('⚠️ Basit kamera başlatılamadı, mock mode kullanılıyor:', error.message);
                    realCameraMode = false;
                    mockMode = true;
                }
            }
            
            if (!isMonitoring) {
                isMonitoring = true;
                
                if (realCameraMode) {
                    this.startSimpleCameraLoop();
                    console.log('✅ PPE Monitoring başlatıldı (Basit Kamera)');
                    res.json({
                        success: true,
                        message: 'PPE monitoring başlatıldı (Gerçek Kamera)',
                        data: { status: 'running', mode: 'simple_camera' }
                    });
                } else {
                    this.startMockDetections();
                    console.log('✅ PPE Monitoring başlatıldı (Mock Mode)');
                    res.json({
                        success: true,
                        message: 'PPE monitoring başlatıldı (Test Modu)',
                        data: { status: 'running', mode: 'mock' }
                    });
                }
            } else {
                res.json({
                    success: false,
                    message: 'Monitoring zaten çalışıyor',
                    data: { status: 'already_running' }
                });
            }
        } catch (error) {
            console.error('❌ PPE monitoring başlatma hatası:', error.message);
            res.status(500).json({
                success: false,
                message: 'PPE monitoring başlatılamadı',
                error: error.message
            });
        }
    }
    
    // ✨ GÜNCELLENMIŞ: PPE monitoring durdur
    async stopMonitoring(req, res) {
        try {
            console.log('⏹️ PPE Monitoring durdurma isteği alındı');
            isMonitoring = false;
            
            // Basit kamera durdur
            if (realCameraMode) {
                if (cameraInterval) {
                    clearInterval(cameraInterval);
                    cameraInterval = null;
                }
                currentFrame = null;
                realCameraMode = false;
                Webcam = null;
                console.log('✅ Basit kamera durduruldu');
            }
            
            // Mock durdur
            if (mockInterval) {
                clearInterval(mockInterval);
                mockInterval = null;
            }
            mockDetections = [];
            mockMode = true;
            
            res.json({
                success: true,
                message: 'PPE monitoring durduruldu',
                data: { status: 'stopped' }
            });
        } catch (error) {
            console.error('❌ Durdurma hatası:', error);
            res.json({
                success: true,
                message: 'Monitoring durduruldu (zorla)',
                data: { status: 'stopped' }
            });
        }
    }

    // İstatistik güncelleme
    updateStatsFromDetections(detections) {
        detections.forEach(detection => {
            mockStats.totalDetections++;
            if (detection.has_helmet) {
                mockStats.safeDetections++;
            } else {
                mockStats.violations++;
            }
        });
        
        mockStats.complianceRate = Math.round(
            (mockStats.safeDetections / Math.max(mockStats.totalDetections, 1)) * 100
        );
        mockStats.activeWorkers = Math.min(15, Math.ceil(mockStats.totalDetections / 3));
    }
    
    // MEVCUT METODLAR (DEĞİŞMEDİ)
    async getDetections(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    detections: mockDetections.slice(-10),
                    isMonitoring,
                    mode: realCameraMode ? 'simple_camera' : 'mock',
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    detections: mockDetections.slice(-10),
                    isMonitoring,
                    mode: 'fallback',
                    error: error.message
                }
            });
        }
    }
    
    async getStats(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    totalDetections: mockStats.totalDetections,
                    safeDetections: mockStats.safeDetections,
                    violations: mockStats.violations,
                    complianceRate: mockStats.complianceRate,
                    activeWorkers: mockStats.activeWorkers,
                    isMonitoring,
                    mode: realCameraMode ? 'simple_camera' : 'mock',
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    totalDetections: mockStats.totalDetections,
                    safeDetections: mockStats.safeDetections,
                    violations: mockStats.violations,
                    complianceRate: mockStats.complianceRate,
                    activeWorkers: mockStats.activeWorkers,
                    isMonitoring,
                    mode: 'fallback',
                    error: error.message
                }
            });
        }
    }

    // MEVCUT MOCK METODLAR
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
            console.log('✅ C++ Bridge aktif');
        } catch (error) {
            console.log('🎭 C++ Bridge bulunamadı');
        }
    }
}

const ppeController = new PPEController();
ppeController.checkCppBridge();

// Kamera durumu kontrolü
const getCameraStatus = async (req, res) => {
    try {
        console.log('📊 Kamera durumu kontrol ediliyor...');
        
        res.json({
            success: true,
            data: {
                camera_available: true,
                simple_camera_available: !!NodeWebcam,
                message: NodeWebcam ? 'Basit kamera kullanılabilir' : 'Sadece mock mode kullanılabilir',
                mockMode: mockMode,
                realCameraMode: realCameraMode,
                isMonitoring: isMonitoring,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Kamera durumu kontrol hatası:', error);
        res.status(500).json({
            success: false,
            data: {
                camera_available: false,
                message: `Kamera kontrolü hatası: ${error.message}`
            }
        });
    }
};

// ✨ GÜNCELLENMIŞ: Kamera stream
const getCameraStream = async (req, res) => {
    try {
        console.log('📹 Kamera stream başlatılıyor...');
        
        // Gerçek kamera frame'i varsa onu döndür
        if (realCameraMode && currentFrame) {
            res.json({
                success: true,
                data: {
                    frame: currentFrame,
                    timestamp: Date.now(),
                    isMonitoring: isMonitoring,
                    mode: 'simple_camera',
                    stats: mockStats,
                    detections: mockDetections.slice(-5) // Son 5 tespit
                }
            });
            return;
        }
        
        // Mock frame oluştur
        const createMockFrame = () => {
            const timestamp = new Date().toLocaleTimeString('tr-TR');
            const detectionCount = mockStats.totalDetections;
            const violationCount = mockStats.violations;
            
            const svgFrame = `
                <svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#34495e;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    
                    <rect width="100%" height="100%" fill="url(#bg)"/>
                    
                    ${isMonitoring ? `
                        <rect x="200" y="150" width="80" height="120" fill="none" stroke="#2ecc71" stroke-width="3"/>
                        <text x="240" y="140" text-anchor="middle" fill="#2ecc71" font-size="12" font-weight="bold">✓ GÜVENLİ</text>
                        
                        <rect x="350" y="180" width="75" height="110" fill="none" stroke="#e74c3c" stroke-width="3"/>
                        <text x="387" y="170" text-anchor="middle" fill="#e74c3c" font-size="12" font-weight="bold">⚠ BARET YOK</text>
                        
                        <circle cx="240" cy="210" r="25" fill="#3498db" opacity="0.8"/>
                        <text x="240" y="215" text-anchor="middle" fill="white" font-size="16">👷</text>
                        
                        <circle cx="387" cy="235" r="25" fill="#e74c3c" opacity="0.8"/>
                        <text x="387" y="240" text-anchor="middle" fill="white" font-size="16">👤</text>
                        
                        <rect x="100" y="300" width="60" height="100" fill="none" stroke="#f39c12" stroke-width="2"/>
                        <text x="130" y="290" text-anchor="middle" fill="#f39c12" font-size="10">KONTROL</text>
                        <circle cx="130" cy="350" r="20" fill="#f39c12" opacity="0.6"/>
                        <text x="130" y="355" text-anchor="middle" fill="white" font-size="12">👨‍💼</text>
                    ` : `
                        <text x="320" y="240" text-anchor="middle" fill="#95a5a6" font-size="18">
                            İzleme başlatmak için "Başlat" butonuna tıklayın
                        </text>
                    `}
                    
                    <text x="320" y="50" text-anchor="middle" fill="white" font-size="24" font-weight="bold">
                        PPE DETECTION SYSTEM
                    </text>
                    
                    <text x="320" y="80" text-anchor="middle" fill="${isMonitoring ? '#2ecc71' : '#95a5a6'}" font-size="16" font-weight="bold">
                        ${isMonitoring ? (realCameraMode ? '🔴 KAMERA AKTİF' : '🔴 TEST MODU AKTİF') : '⚪ BEKLEMEDE'}
                    </text>
                    
                    <text x="320" y="420" text-anchor="middle" fill="white" font-size="18" font-weight="bold">
                        ${timestamp}
                    </text>
                    
                    <rect x="0" y="440" width="640" height="40" fill="rgba(0,0,0,0.7)"/>
                    <text x="80" y="460" fill="#3498db" font-size="14" font-weight="bold">
                        Toplam: ${detectionCount}
                    </text>
                    <text x="220" y="460" fill="#e74c3c" font-size="14" font-weight="bold">
                        İhlal: ${violationCount}
                    </text>
                    <text x="350" y="460" fill="#2ecc71" font-size="14" font-weight="bold">
                        Güvenli: ${mockStats.safeDetections}
                    </text>
                    <text x="500" y="460" fill="#f39c12" font-size="14" font-weight="bold">
                        Uyum: ${mockStats.complianceRate}%
                    </text>
                </svg>
            `;

            const base64 = Buffer.from(svgFrame).toString('base64');
            return `data:image/svg+xml;base64,${base64}`;
        };

        res.json({
            success: true,
            data: {
                frame: createMockFrame(),
                timestamp: Date.now(),
                isMonitoring: isMonitoring,
                mode: realCameraMode ? 'simple_camera' : 'mock',
                stats: mockStats
            }
        });

    } catch (error) {
        console.error('❌ Kamera stream hatası:', error);
        res.status(500).json({
            success: false,
            message: `Stream hatası: ${error.message}`
        });
    }
};

// EXPORT
module.exports = {
    startMonitoring: (req, res) => ppeController.startMonitoring(req, res),
    stopMonitoring: (req, res) => ppeController.stopMonitoring(req, res),
    getDetections: (req, res) => ppeController.getDetections(req, res),
    getStats: (req, res) => ppeController.getStats(req, res),
    getStatistics: (req, res) => ppeController.getStats(req, res),
    getCameraStream,
    getCameraStatus
};
