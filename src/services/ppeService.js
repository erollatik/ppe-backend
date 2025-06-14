const axios = require('axios');

class PPEService {
    constructor() {
        this.baseURL = process.env.PPE_API_URL || 'http://localhost:8080';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 2000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Frame cache için - daha agresif caching
        this.lastFrame = null;
        this.lastFrameTime = 0;
        this.frameCacheDuration = 80; // 80ms cache (12.5 FPS için)
        this.frameBuffer = []; // Frame buffer
        this.maxBufferSize = 8; // Daha büyük buffer
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 5;
        this.stableFrameCount = 0;
        this.minStableFrames = 3; // En az 3 stabil frame
    }

    async startStream() {
        try {
            const response = await this.client.post('/stream/start');
            return { success: true, data: response.data };
        } catch (error) {
            console.error('PPE stream start error:', error.message);
            throw new Error('Failed to start PPE stream');
        }
    }

    async stopStream() {
        try {
            const response = await this.client.post('/stream/stop');
            return { success: true, data: response.data };
        } catch (error) {
            console.error('PPE stream stop error:', error.message);
            throw new Error('Failed to stop PPE stream');
        }
    }

    async getFrame() {
        try {
            // Frame cache kontrolü - daha agresif
            const now = Date.now();
            if (this.lastFrame && (now - this.lastFrameTime) < this.frameCacheDuration) {
                return this.lastFrame;
            }
            
            const response = await this.client.get('/frame', {
                responseType: 'arraybuffer',
                timeout: 2000 // Daha uzun timeout
            });
            
            // Frame validation - daha sıkı kontrol
            if (!response.data || response.data.byteLength < 5000) {
                throw new Error('Invalid or too small frame data');
            }
            
            const base64 = Buffer.from(response.data).toString('base64');
            
            // Frame stability kontrolü
            if (this.lastFrame && base64 === this.lastFrame) {
                // Aynı frame, cache süresini uzat
                this.lastFrameTime = now;
                return this.lastFrame;
            }
            
            // Frame buffer'a ekle
            this.frameBuffer.push(base64);
            if (this.frameBuffer.length > this.maxBufferSize) {
                this.frameBuffer.shift();
            }
            
            // Stability counter
            this.stableFrameCount++;
            
            // Cache'e kaydet - sadece stabil frame'ler için
            if (this.stableFrameCount >= this.minStableFrames) {
                this.lastFrame = base64;
                this.lastFrameTime = now;
                this.consecutiveErrors = 0;
                return base64;
            } else {
                // Henüz stabil değil, önceki frame'i döndür
                if (this.lastFrame) {
                    return this.lastFrame;
                }
                return base64;
            }
            
        } catch (error) {
            this.consecutiveErrors++;
            this.stableFrameCount = 0; // Reset stability
            console.error('PPE frame error:', error.message);
            
            // Önce cache'den döndürmeyi dene
            if (this.lastFrame && this.consecutiveErrors < 3) {
                return this.lastFrame;
            }
            
            // Sonra buffer'dan en stabil frame'i döndür
            if (this.frameBuffer.length > 2) {
                // Buffer'ın ortasındaki frame'i döndür (daha stabil)
                const middleIndex = Math.floor(this.frameBuffer.length / 2);
                return this.frameBuffer[middleIndex];
            }
            
            throw new Error('Failed to get PPE frame');
        }
    }

    async getDetections() {
        try {
            const response = await this.client.get('/detection');
            return response.data;
        } catch (error) {
            console.error('PPE detections error:', error.message);
            throw new Error('Failed to get PPE detections');
        }
    }

    async checkHealth() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch (error) {
            console.error('PPE health check error:', error.message);
            return false;
        }
    }

    // Mail fonksiyonları
    async getMailStatus() {
        try {
            const response = await this.client.get('/mail/status');
            return response.data;
        } catch (error) {
            console.error('PPE mail status error:', error.message);
            throw new Error('Failed to get mail status');
        }
    }

    async toggleMail(enabled) {
        try {
            const response = await this.client.post('/mail/toggle', { enabled });
            return response.data;
        } catch (error) {
            console.error('PPE mail toggle error:', error.message);
            throw new Error('Failed to toggle mail');
        }
    }

    async setMailRecipient(email) {
        try {
            const response = await this.client.post('/mail/set-recipient', { email });
            return response.data;
        } catch (error) {
            console.error('PPE mail recipient error:', error.message);
            throw new Error('Failed to set mail recipient');
        }
    }

    async sendMail() {
        try {
            const response = await this.client.post('/mail/send');
            return response.data;
        } catch (error) {
            console.error('PPE mail send error:', error.message);
            throw new Error('Failed to send mail');
        }
    }
}

module.exports = new PPEService(); 