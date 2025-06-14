const axios = require('axios');

class CppBridge {
    constructor() {
        this.cppServerUrl = 'http://localhost:8080';
        this.isConnected = false;
        this.detectionActive = false;
        this.lastDetections = [];
        this.connectionCheckInterval = null;
        
        // Bağlantıyı kontrol et
        this.checkConnection();
        
        // Periyodik bağlantı kontrolü (5 saniyede bir)
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 5000);
        
        console.log('🔧 CppBridge başlatıldı');
    }
    
    // ✅ C++ Server bağlantı kontrolü
    async checkConnection() {
        try {
            const response = await axios.get(`${this.cppServerUrl}/health`, { 
                timeout: 2000 
            });
            
            if (!this.isConnected && response.status === 200) {
                console.log('✅ C++ Server bağlantısı kuruldu');
            }
            this.isConnected = true;
            return true;
        } catch (error) {
            if (this.isConnected) {
                console.log('❌ C++ Server bağlantısı kesildi');
            }
            this.isConnected = false;
            return false;
        }
    }
    
    // ✅ PPE Detection başlat
    async startMonitoring(options = {}) {
        if (!this.isConnected) {
            throw new Error('C++ Server bağlantısı yok');
        }
        
        try {
            const payload = {
                camera_index: options.cameraIndex || 0,
                model_path: options.modelPath || "./model/yolo_model.onnx",
                confidence_threshold: options.confidence || 0.5,
                use_camera: options.useCamera !== undefined ? options.useCamera : true,
                detection_mode: options.detectionMode || "realtime"
            };
            
            console.log('🎬 C++ Detection başlatılıyor...', payload);
            
            const response = await axios.post(
                `${this.cppServerUrl}/api/detection/start`, 
                payload,
                { timeout: 10000 }
            );
            
            this.detectionActive = true;
            console.log('✅ C++ Detection başlatıldı:', response.data);
            
            return {
                success: true,
                message: 'C++ Detection başlatıldı',
                data: response.data
            };
        } catch (error) {
            console.error('❌ C++ Detection başlatma hatası:', error.response?.data || error.message);
            throw new Error(`C++ Detection başlatma hatası: ${error.response?.data?.message || error.message}`);
        }
    }
    
    // ✅ PPE Detection durdur
    async stopMonitoring() {
        if (!this.isConnected) {
            return { success: false, message: 'C++ Server bağlantısı yok' };
        }
        
        try {
            console.log('⏹️ C++ Detection durduruluyor...');
            
            const response = await axios.post(
                `${this.cppServerUrl}/api/detection/stop`,
                {},
                { timeout: 5000 }
            );
            
            this.detectionActive = false;
            this.lastDetections = [];
            console.log('✅ C++ Detection durduruldu');
            
            return {
                success: true,
                message: 'C++ Detection durduruldu',
                data: response.data
            };
        } catch (error) {
            console.error('❌ C++ Detection durdurma hatası:', error.response?.data || error.message);
            return {
                success: false,
                message: `C++ Detection durdurma hatası: ${error.response?.data?.message || error.message}`
            };
        }
    }
    
    // ✅ Gerçek zamanlı detection sonuçları al
    async getDetections() {
        if (!this.isConnected) {
            return {
                success: true,
                data: { detections: [] }
            };
        }
        
        if (!this.detectionActive) {
            return {
                success: true,
                data: { detections: this.lastDetections }
            };
        }
        
        try {
            const response = await axios.get(
                `${this.cppServerUrl}/api/detection/results`,
                { timeout: 2000 }
            );
            
            // Detection formatını normalize et
            const detections = this.normalizeDetections(response.data.detections || []);
            this.lastDetections = detections;
            
            return {
                success: true,
                data: { 
                    detections,
                    timestamp: new Date().toISOString(),
                    active_workers: detections.length,
                    violations: detections.filter(d => !d.has_helmet).length
                }
            };
        } catch (error) {
            // Hata durumunda son detections'ı döndür
            return {
                success: true,
                data: { 
                    detections: this.lastDetections,
                    timestamp: new Date().toISOString(),
                    error: error.message
                }
            };
        }
    }
    
    // ✅ Detection formatını normalize et
    normalizeDetections(rawDetections) {
        if (!Array.isArray(rawDetections)) {
            return [];
        }
        
        return rawDetections.map((detection, index) => ({
            id: detection.id || `det_${Date.now()}_${index}`,
            track_id: detection.track_id || detection.person_id || (index + 1),
            worker_id: detection.worker_id || `W${detection.track_id || detection.person_id || (index + 1)}`,
            has_helmet: detection.has_helmet !== undefined ? detection.has_helmet : 
                       detection.helmet_detected !== undefined ? detection.helmet_detected : true,
            confidence: detection.confidence || 0.8,
            bbox: {
                x: detection.bbox?.x || detection.x || 0,
                y: detection.bbox?.y || detection.y || 0,
                width: detection.bbox?.width || detection.w || 100,
                height: detection.bbox?.height || detection.h || 100
            },
            timestamp: detection.timestamp || new Date().toISOString(),
            safety_status: (detection.has_helmet !== undefined ? detection.has_helmet : 
                           detection.helmet_detected !== undefined ? detection.helmet_detected : true) ? 'safe' : 'danger'
        }));
    }
    
    // ✅ İstatistikler al
    async getStats() {
        if (!this.isConnected) {
            return {
                success: false,
                message: 'C++ Server bağlantısı yok'
            };
        }
        
        try {
            const response = await axios.get(
                `${this.cppServerUrl}/api/stats`,
                { timeout: 3000 }
            );
            
            return {
                success: true,
                data: {
                    active_workers: response.data.active_workers || 0,
                    today_violations: response.data.today_violations || 0,
                    total_detections: response.data.total_detections || 0,
                    daily_stats: {
                        total_detections: response.data.daily_stats?.total_detections || response.data.total_detections || 0,
                        safe_detections: response.data.daily_stats?.safe_detections || response.data.safe_detections || 0,
                        violations: response.data.daily_stats?.violations || response.data.today_violations || 0,
                        compliance_rate: response.data.daily_stats?.compliance_rate || response.data.compliance_rate || 100
                    }
                }
            };
        } catch (error) {
            console.error('❌ C++ Stats alma hatası:', error.message);
            return {
                success: false,
                message: `Stats alma hatası: ${error.message}`,
                data: {
                    active_workers: 0,
                    today_violations: 0,
                    total_detections: 0,
                    daily_stats: {
                        total_detections: 0,
                        safe_detections: 0,
                        violations: 0,
                        compliance_rate: 100
                    }
                }
            };
        }
    }
    
    // ✅ Frame gönder (kamera görüntüsü)
    async sendFrame(frameBlob) {
        if (!this.isConnected || !this.detectionActive) {
            return { success: false, message: 'Detection aktif değil' };
        }
        
        try {
            const formData = new FormData();
            formData.append('frame', frameBlob, 'frame.jpg');
            
            const response = await axios.post(
                `${this.cppServerUrl}/api/detection/frame`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 5000
                }
            );
            
            return {
                success: true,
                detections: this.normalizeDetections(response.data.detections || []),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Frame gönderme hatası:', error.message);
            return { 
                success: false, 
                message: `Frame gönderme hatası: ${error.message}` 
            };
        }
    }
    
    // ✅ Kamera listesi al
    async getCameras() {
        if (!this.isConnected) {
            return { success: false, message: 'C++ Server bağlantısı yok' };
        }
        
        try {
            const response = await axios.get(
                `${this.cppServerUrl}/api/cameras`,
                { timeout: 3000 }
            );
            
            return {
                success: true,
                cameras: response.data.cameras || []
            };
        } catch (error) {
            console.error('❌ Kamera listesi alma hatası:', error.message);
            return {
                success: false,
                message: error.message,
                cameras: []
            };
        }
    }
    
    // ✅ Durum bilgisi
    getStatus() {
        return {
            connected: this.isConnected,
            detecting: this.detectionActive,
            serverUrl: this.cppServerUrl,
            lastDetectionCount: this.lastDetections.length,
            lastUpdate: new Date().toISOString()
        };
    }
    
    // ✅ Cleanup
    destroy() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
        
        if (this.detectionActive) {
            this.stopMonitoring();
        }
        
        console.log('🔧 CppBridge temizlendi');
    }
}

module.exports = new CppBridge();
