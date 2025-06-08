#include <httplib.h>
#include <json/json.h>
#include <opencv2/opencv.hpp>
#include <iostream>
#include <thread>
#include <mutex>
#include <queue>

class PPEBridge {
private:
    cv::VideoCapture camera;
    httplib::Server server;
    std::mutex detection_mutex;
    std::queue<Json::Value> detection_queue;
    bool is_running = false;
    
public:
    void startBridge() {
        // CORS ayarları
        server.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set_header("Access-Control-Allow-Headers", "Content-Type");
            return httplib::Server::HandlerResponse::Unhandled;
        });
        
        // Kamera stream endpoint'i
        server.Get("/camera/stream", [this](const httplib::Request& req, httplib::Response& res) {
            streamCamera(res);
        });
        
        // PPE tespit sonuçları
        server.Get("/ppe/detections", [this](const httplib::Request& req, httplib::Response& res) {
            Json::Value result;
            result["status"] = "success";
            result["detections"] = getLatestDetections();
            result["timestamp"] = static_cast<int64_t>(std::time(nullptr));
            
            res.set_content(result.toStyledString(), "application/json");
        });
        
        // İstatistikler
        server.Get("/ppe/stats", [this](const httplib::Request& req, httplib::Response& res) {
            Json::Value stats;
            stats["total_workers"] = 8;
            stats["violations"] = 2;
            stats["compliance_rate"] = 75.0;
            stats["active_cameras"] = 1;
            
            res.set_content(stats.toStyledString(), "application/json");
        });
        
        // Monitoring başlat/durdur
        server.Post("/ppe/start", [this](const httplib::Request& req, httplib::Response& res) {
            is_running = true;
            startDetectionThread();
            
            Json::Value response;
            response["status"] = "started";
            response["message"] = "PPE monitoring başlatıldı";
            
            res.set_content(response.toStyledString(), "application/json");
        });
        
        server.Post("/ppe/stop", [this](const httplib::Request& req, httplib::Response& res) {
            is_running = false;
            
            Json::Value response;
            response["status"] = "stopped";
            response["message"] = "PPE monitoring durduruldu";
            
            res.set_content(response.toStyledString(), "application/json");
        });
        
        std::cout << "🚀 PPE Bridge Server başlatıldı: http://localhost:8080" << std::endl;
        server.listen("localhost", 8080);
    }
    
private:
    void streamCamera(httplib::Response& res) {
        if (!camera.isOpened()) {
            camera.open(0);
        }
        
        if (!camera.isOpened()) {
            res.status = 500;
            res.set_content("Kamera açılamadı", "text/plain");
            return;
        }
        
        res.set_header("Content-Type", "multipart/x-mixed-replace; boundary=frame");
        
        cv::Mat frame;
        while (camera.read(frame)) {
            // PPE tespiti yap (arkadaşının fonksiyonunu çağır)
            auto detections = performPPEDetection(frame);
            
            // Tespit sonuçlarını frame üzerine çiz
            drawDetections(frame, detections);
            
            // Frame'i JPEG'e çevir
            std::vector<uchar> buffer;
            cv::imencode(".jpg", frame, buffer);
            
            std::string frame_data(buffer.begin(), buffer.end());
            std::string response_data = "--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_data + "\r\n";
            
            res.body += response_data;
            
            std::this_thread::sleep_for(std::chrono::milliseconds(33)); // ~30 FPS
        }
    }
    
    Json::Value getLatestDetections() {
        Json::Value detections = Json::arrayValue;
        
        // Örnek tespit verisi (gerçekte arkadaşının algoritmasından gelecek)
        Json::Value detection;
        detection["person_id"] = "worker_001";
        detection["confidence"] = 0.85;
        detection["equipment"]["helmet"] = true;
        detection["equipment"]["vest"] = false; // İhlal!
        detection["equipment"]["gloves"] = true;
        detection["violations"] = Json::arrayValue;
        detection["violations"].append("Yelek eksik");
        detection["bbox"] = Json::arrayValue;
        detection["bbox"].append(100); // x
        detection["bbox"].append(50);  // y
        detection["bbox"].append(200); // width
        detection["bbox"].append(300); // height
        
        detections.append(detection);
        return detections;
    }
    
    void startDetectionThread() {
        std::thread([this]() {
            while (is_running) {
                // Burada arkadaşının PPE tespit algoritmasını çağır
                auto detections = performPPEDetection();
                
                std::lock_guard<std::mutex> lock(detection_mutex);
                detection_queue.push(detections);
                
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
            }
        }).detach();
    }
    
    Json::Value performPPEDetection(cv::Mat frame = cv::Mat()) {
        // Burada arkadaşının PPE tespit fonksiyonunu çağır
        // Şimdilik örnek veri döndürüyoruz
        Json::Value result;
        result["detected"] = true;
        result["person_count"] = 1;
        result["violations"] = 1;
        return result;
    }
    
    void drawDetections(cv::Mat& frame, const Json::Value& detections) {
        // Tespit sonuçlarını frame üzerine çiz
        cv::rectangle(frame, cv::Point(100, 50), cv::Point(300, 350), cv::Scalar(0, 255, 0), 2);
        cv::putText(frame, "Worker - Helmet: OK, Vest: MISSING", 
                   cv::Point(100, 40), cv::FONT_HERSHEY_SIMPLEX, 0.6, cv::Scalar(0, 0, 255), 2);
    }
};

int main() {
    PPEBridge bridge;
    bridge.startBridge();
    return 0;
}
