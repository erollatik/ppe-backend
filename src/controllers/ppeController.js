const axios = require('axios');

const CPP_BRIDGE_URL = 'http://localhost:8080';

class PPEController {
    // PPE monitoring başlat
    async startMonitoring(req, res) {
        try {
            const response = await axios.post(`${CPP_BRIDGE_URL}/ppe/start`);
            res.json({
                success: true,
                message: 'PPE monitoring başlatıldı',
                data: response.data
            });
        } catch (error) {
            console.error('C++ Bridge bağlantı hatası:', error.message);
            res.status(500).json({
                success: false,
                message: 'C++ uygulamasına bağlanılamadı',
                error: error.message
            });
        }
    }
    
    // PPE monitoring durdur
    async stopMonitoring(req, res) {
        try {
            const response = await axios.post(`${CPP_BRIDGE_URL}/ppe/stop`);
            res.json({
                success: true,
                message: 'PPE monitoring durduruldu',
                data: response.data
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Monitoring durdurulamadı',
                error: error.message
            });
        }
    }
    
    // Son tespitleri al
    async getDetections(req, res) {
        try {
            const response = await axios.get(`${CPP_BRIDGE_URL}/ppe/detections`);
            res.json({
                success: true,
                data: response.data
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Tespit verileri alınamadı',
                error: error.message
            });
        }
    }
    
    // İstatistikleri al
    async getStats(req, res) {
        try {
            const response = await axios.get(`${CPP_BRIDGE_URL}/ppe/stats`);
            res.json({
                success: true,
                data: response.data
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'İstatistik verileri alınamadı',
                error: error.message
            });
        }
    }
    
    // Kamera stream proxy
    async getCameraStream(req, res) {
        try {
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
}

module.exports = new PPEController();
