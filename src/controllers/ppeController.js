const axios = require('axios');

const CPP_BRIDGE_URL = 'http://localhost:8080';
const cppBridge = require('../cpp-bridge/cppBridge');

class PPEController {
    // ✨ YENİ: Basit kamera başlatma
    async initializeSimpleCamera() {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }

    // ✨ YENİ: Kamera snapshot döngüsü
    startSimpleCameraLoop() {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }

    // ✨ YENİ: Mock tespit üretimi
    generateMockDetections() {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }

    // ✨ GÜNCELLENMIŞ: PPE monitoring başlat
    async startMonitoring(req, res) {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }
    
    // ✨ GÜNCELLENMIŞ: PPE monitoring durdur
    async stopMonitoring(req, res) {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }

    // İstatistik güncelleme
    updateStatsFromDetections(detections) {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }
    
    // MEVCUT METODLAR (DEĞİŞMEDİ)
    async getDetections(req, res) {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }
    
    async getStats(req, res) {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }

    // MEVCUT MOCK METODLAR
    startMockDetections() {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }

    updateMockStats(detection) {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }

    async checkCppBridge() {
        // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
    }
}

const ppeController = new PPEController();
ppeController.checkCppBridge();

// Kamera durumu kontrolü
const getCameraStatus = async (req, res) => {
    // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
};

// ✨ GÜNCELLENMIŞ: Kamera stream
const getCameraStream = async (req, res) => {
    // Tüm kamera ve mock ile ilgili kodlar kaldırıldı. Sadece C++ sunucusuna proxy yapan fonksiyonlar kalmalı.
};

// Mail controller methods
const getMailStatus = async (req, res) => {
    try {
        console.log('📧 Mail durumu istendi');
        const response = await axios.get(`${CPP_BRIDGE_URL}/mail/status`);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Mail durumu alınamadı:', error.message);
        res.status(500).json({ error: 'Mail durumu alınamadı' });
    }
};

const toggleMail = async (req, res) => {
    try {
        console.log('📧 Mail toggle istendi:', req.body);
        const response = await axios.post(`${CPP_BRIDGE_URL}/mail/toggle`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Mail toggle hatası:', error.message);
        res.status(500).json({ error: 'Mail ayarı güncellenemedi' });
    }
};

const setMailRecipient = async (req, res) => {
    try {
        console.log('📧 Mail alıcı güncelleme istendi:', req.body);
        const response = await axios.post(`${CPP_BRIDGE_URL}/mail/set-recipient`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Mail alıcı güncelleme hatası:', error.message);
        res.status(500).json({ error: 'Mail alıcısı güncellenemedi' });
    }
};

const sendTestMail = async (req, res) => {
    try {
        console.log('📧 Test mail gönderimi istendi');
        const response = await axios.post(`${CPP_BRIDGE_URL}/mail/send`);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Test mail gönderimi hatası:', error.message);
        res.status(500).json({ error: 'Test maili gönderilemedi' });
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
    getCameraStatus,
    getMailStatus,
    toggleMail,
    setMailRecipient,
    sendTestMail
};
