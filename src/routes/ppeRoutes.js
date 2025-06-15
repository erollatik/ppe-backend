const express = require("express");
const ppeController = require("../controllers/ppeController");
const router = express.Router();
const ppeService = require('../services/ppeService');
const { Worker } = require('../models/database');
const XLSX = require("xlsx");
const puppeteer = require("puppeteer");
const fileUpload = require('../middleware/fileUpload');

// ✅ Temel monitoring route'ları
router.post("/start-monitoring", ppeController.startMonitoring);
router.post("/stop-monitoring", ppeController.stopMonitoring);
router.get("/detections", ppeController.getDetections);
router.get("/stats", ppeController.getStats);
router.get("/camera/stream", ppeController.getCameraStream);
router.get("/camera/status", ppeController.getCameraStatus);

// ✅ Geriye uyumluluk
router.post("/start", ppeController.startMonitoring);
router.post("/stop", ppeController.stopMonitoring);

// ✅ Mail endpoint'leri
router.get("/mail/status", async (req, res) => {
  try {
    console.log("📧 Mail durumu istendi");
    const response = await ppeService.getMailStatus();
    res.json(response);
  } catch (error) {
    console.error("❌ Mail durumu alınamadı:", error);
    res.status(500).json({ error: "Mail durumu alınamadı" });
  }
});

router.post("/mail/toggle", async (req, res) => {
  try {
    console.log("📧 Mail toggle istendi:", req.body);
    const { enabled } = req.body;
    const response = await ppeService.toggleMail(enabled);
    res.json(response);
  } catch (error) {
    console.error("❌ Mail toggle hatası:", error);
    res.status(500).json({ error: "Mail ayarı değiştirilemedi" });
  }
});

router.post("/mail/set-recipient", async (req, res) => {
  try {
    console.log("📧 Mail alıcısı ayarlanıyor:", req.body);
    const { email } = req.body;
    const response = await ppeService.setMailRecipient(email);
    res.json(response);
  } catch (error) {
    console.error("❌ Mail alıcısı ayarlanamadı:", error);
    res.status(500).json({ error: "Mail alıcısı ayarlanamadı" });
  }
});

router.post("/mail/send", async (req, res) => {
  try {
    console.log("📧 Manuel mail gönderimi istendi");
    const response = await ppeService.sendMail();
    res.json(response);
  } catch (error) {
    console.error("❌ Mail gönderilemedi:", error);
    res.status(500).json({ error: "Mail gönderilemedi" });
  }
});

// ================================
// ✅ DAILY STATS ENDPOINT
// ================================

router.get("/daily-stats", (req, res) => {
  console.log("📊 Daily stats istendi");

  try {
    // Bugünden geriye 30 gün
    const today = new Date();
    const dailyStatsData = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Mock data - gerçek uygulamada veritabanından gelecek
      const detections = Math.floor(Math.random() * 50) + 10; // 10-60 arası
      const violations = Math.floor(Math.random() * 8) + 1; // 1-8 arası
      const compliance = Math.round(
        ((detections - violations) / detections) * 100
      );

      dailyStatsData.push({
        date: date.toISOString().split("T")[0], // YYYY-MM-DD format
        dateFormatted: date.toLocaleDateString("tr-TR"), // DD/MM/YYYY format
        detections: detections,
        violations: violations,
        safeDetections: detections - violations,
        complianceRate: compliance,
        workingHours: 8,
        activeWorkers: Math.floor(Math.random() * 15) + 25, // 25-40 arası
        averageConfidence: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100, // 0.70-1.00
        topViolationType: Math.random() > 0.5 ? "Eksik PPE" : "Yanlış PPE",
        hourlyBreakdown: generateHourlyData(), // Saatlik detay
      });
    }

    // Son 30 günün özet istatistikleri
    const totalDetections = dailyStatsData.reduce(
      (sum, day) => sum + day.detections,
      0
    );
    const totalViolations = dailyStatsData.reduce(
      (sum, day) => sum + day.violations,
      0
    );
    const averageCompliance = Math.round(
      dailyStatsData.reduce((sum, day) => sum + day.complianceRate, 0) /
        dailyStatsData.length
    );

    // Trend analizi (son 7 gün vs önceki 7 gün)
    const lastWeekStats = dailyStatsData.slice(-7);
    const previousWeekStats = dailyStatsData.slice(-14, -7);

    const lastWeekAvg =
      lastWeekStats.reduce((sum, day) => sum + day.complianceRate, 0) / 7;
    const previousWeekAvg =
      previousWeekStats.reduce((sum, day) => sum + day.complianceRate, 0) / 7;
    const trend = ((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100;

    const responseData = {
      success: true,
      data: {
        // Ana günlük veriler
        dailyData: dailyStatsData,

        // Özet istatistikler
        summary: {
          totalDetections,
          totalViolations,
          totalSafeDetections: totalDetections - totalViolations,
          averageCompliance,
          bestDay: dailyStatsData.reduce((best, day) =>
            day.complianceRate > best.complianceRate ? day : best
          ),
          worstDay: dailyStatsData.reduce((worst, day) =>
            day.complianceRate < worst.complianceRate ? day : worst
          ),
          totalWorkingDays: dailyStatsData.length,
          averageDetectionsPerDay: Math.round(
            totalDetections / dailyStatsData.length
          ),
        },

        // Trend analizi
        trends: {
          complianceChange: Math.round(trend * 100) / 100,
          direction:
            trend > 0 ? "improving" : trend < 0 ? "declining" : "stable",
          lastWeekAverage: Math.round(lastWeekAvg * 100) / 100,
          previousWeekAverage: Math.round(previousWeekAvg * 100) / 100,
        },

        // Haftalık gruplandırma
        weeklyData: groupByWeek(dailyStatsData),

        // En çok ihlal olan günler
        topViolationDays: dailyStatsData
          .sort((a, b) => b.violations - a.violations)
          .slice(0, 5),

        // En iyi performans günleri
        topPerformanceDays: dailyStatsData
          .sort((a, b) => b.complianceRate - a.complianceRate)
          .slice(0, 5),

        // Hafta içi vs hafta sonu analizi
        weekdayAnalysis: analyzeWeekdays(dailyStatsData),
      },
      timestamp: new Date().toISOString(),
      period: {
        startDate: dailyStatsData[0].date,
        endDate: dailyStatsData[dailyStatsData.length - 1].date,
        totalDays: dailyStatsData.length,
      },
    };

    console.log(
      "✅ Daily stats gönderiliyor:",
      dailyStatsData.length,
      "günlük veri"
    );
    res.json(responseData);
  } catch (error) {
    console.error("❌ Daily stats hatası:", error);
    res.status(500).json({
      success: false,
      error: "Daily stats verisi alınamadı",
      message: error.message,
    });
  }
});

// ================================
// ✅ YARDIMCI FONKSİYONLAR
// ================================

function generateHourlyData() {
  const hourlyData = [];
  for (let hour = 8; hour <= 17; hour++) {
    // 08:00 - 17:00 çalışma saatleri
    hourlyData.push({
      hour: hour,
      timeLabel: `${hour.toString().padStart(2, "0")}:00`,
      detections: Math.floor(Math.random() * 8) + 2, // 2-10 arası
      violations: Math.floor(Math.random() * 3), // 0-2 arası
      activeWorkers: Math.floor(Math.random() * 10) + 15, // 15-25 arası
    });
  }
  return hourlyData;
}

function groupByWeek(dailyData) {
  const weeks = [];
  let currentWeek = [];

  dailyData.forEach((day, index) => {
    const dayOfWeek = new Date(day.date).getDay();

    currentWeek.push(day);

    // Pazar günü (0) veya son gün ise haftayı tamamla
    if (dayOfWeek === 0 || index === dailyData.length - 1) {
      const weekDetections = currentWeek.reduce(
        (sum, d) => sum + d.detections,
        0
      );
      const weekViolations = currentWeek.reduce(
        (sum, d) => sum + d.violations,
        0
      );

      weeks.push({
        weekNumber: weeks.length + 1,
        startDate: currentWeek[0].date,
        endDate: currentWeek[currentWeek.length - 1].date,
        days: currentWeek.length,
        totalDetections: weekDetections,
        totalViolations: weekViolations,
        averageCompliance: Math.round(
          currentWeek.reduce((sum, d) => sum + d.complianceRate, 0) /
            currentWeek.length
        ),
        dailyAverage: Math.round(weekDetections / currentWeek.length),
      });

      currentWeek = [];
    }
  });

  return weeks;
}

function analyzeWeekdays(dailyData) {
  const weekdayStats = {
    weekdays: [], // Pazartesi-Cuma
    weekends: [], // Cumartesi-Pazar
  };

  dailyData.forEach((day) => {
    const dayOfWeek = new Date(day.date).getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Pazartesi-Cuma
      weekdayStats.weekdays.push(day);
    } else {
      // Cumartesi-Pazar
      weekdayStats.weekends.push(day);
    }
  });

  const weekdayAvg =
    weekdayStats.weekdays.length > 0
      ? weekdayStats.weekdays.reduce((sum, d) => sum + d.complianceRate, 0) /
        weekdayStats.weekdays.length
      : 0;

  const weekendAvg =
    weekdayStats.weekends.length > 0
      ? weekdayStats.weekends.reduce((sum, d) => sum + d.complianceRate, 0) /
        weekdayStats.weekends.length
      : 0;

  return {
    weekdayAverage: Math.round(weekdayAvg * 100) / 100,
    weekendAverage: Math.round(weekendAvg * 100) / 100,
    weekdayCount: weekdayStats.weekdays.length,
    weekendCount: weekdayStats.weekends.length,
    difference: Math.round((weekdayAvg - weekendAvg) * 100) / 100,
  };
}

// ================================
// ✅ EK STATS ENDPOINTS
// ================================

// Haftalık stats
router.get("/weekly-stats", (req, res) => {
  console.log("📊 Weekly stats istendi");

  const weeklyData = [];
  const today = new Date();

  // Son 12 hafta
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Pazartesi

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Pazar

    const detections = Math.floor(Math.random() * 200) + 100;
    const violations = Math.floor(Math.random() * 30) + 5;

    weeklyData.push({
      weekNumber: 52 - i, // Yılın kaçıncı haftası
      startDate: weekStart.toISOString().split("T")[0],
      endDate: weekEnd.toISOString().split("T")[0],
      detections,
      violations,
      complianceRate: Math.round(
        ((detections - violations) / detections) * 100
      ),
      activeWorkers: Math.floor(Math.random() * 20) + 30,
      workingDays: 5,
    });
  }

  console.log(
    "✅ Weekly stats gönderiliyor:",
    weeklyData.length,
    "haftalık veri"
  );
  res.json({
    success: true,
    data: weeklyData,
    timestamp: new Date().toISOString(),
  });
});

// Aylık stats
router.get("/monthly-stats", (req, res) => {
  console.log("📊 Monthly stats istendi");

  const monthlyData = [];
  const today = new Date();

  // Son 12 ay
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = monthDate.toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric",
    });

    const detections = Math.floor(Math.random() * 800) + 400;
    const violations = Math.floor(Math.random() * 80) + 20;

    monthlyData.push({
      month: monthDate.getMonth() + 1,
      year: monthDate.getFullYear(),
      monthName,
      detections,
      violations,
      complianceRate: Math.round(
        ((detections - violations) / detections) * 100
      ),
      activeWorkers: Math.floor(Math.random() * 25) + 35,
      workingDays: 22,
      averagePerDay: Math.round(detections / 22),
    });
  }

  console.log(
    "✅ Monthly stats gönderiliyor:",
    monthlyData.length,
    "aylık veri"
  );
  res.json({
    success: true,
    data: monthlyData,
    timestamp: new Date().toISOString(),
  });
});

// Gerçek zamanlı stats (son 24 saat)
router.get("/realtime-stats", (req, res) => {
  console.log("📊 Realtime stats istendi");

  const realtimeData = [];
  const now = new Date();

  // Son 24 saat, saatlik veriler
  for (let i = 23; i >= 0; i--) {
    const hourDate = new Date(now);
    hourDate.setHours(hourDate.getHours() - i);

    const detections = Math.floor(Math.random() * 15) + 5;
    const violations = Math.floor(Math.random() * 3);

    realtimeData.push({
      hour: hourDate.getHours(),
      timestamp: hourDate.toISOString(),
      timeLabel: hourDate.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      detections,
      violations,
      complianceRate:
        detections > 0
          ? Math.round(((detections - violations) / detections) * 100)
          : 100,
      activeWorkers: Math.floor(Math.random() * 15) + 10,
    });
  }

  console.log(
    "✅ Realtime stats gönderiliyor:",
    realtimeData.length,
    "saatlik veri"
  );
  res.json({
    success: true,
    data: realtimeData,
    timestamp: new Date().toISOString(),
    nextUpdate: new Date(Date.now() + 60000).toISOString(), // 1 dakika sonra
  });
});

// ✅ Mock data route'ları (controller yerine direkt tanımla)
router.get("/statistics", async (req, res) => {
  try {
    const stats = {
      totalDetections: 156,
      safeDetections: 142,
      violations: 14,
      complianceRate: 91,
      dailyStats: [
        { date: "2025-06-13", detections: 45, violations: 3 },
        { date: "2025-06-12", detections: 52, violations: 2 },
        { date: "2025-06-11", detections: 38, violations: 5 },
      ],
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "İstatistik verisi alınamadı" });
  }
});

// ================================
// WORKERS ENDPOINTS
// ================================

// Departmanları getir
router.get("/departments", (req, res) => {
  console.log("🏢 Departments istendi");
  
  const departments = [
    "Üretim",
    "Kalite Kontrol", 
    "Bakım-Onarım",
    "Depo",
    "Güvenlik",
    "İnsan Kaynakları"
  ];
  
  console.log("✅ Departments gönderiliyor");
  res.json(departments);
});

// Lokasyonları getir
router.get("/locations", (req, res) => {
  console.log("📍 Locations istendi");
  
  const locations = [
    "Ana Üretim Hattı",
    "Montaj Alanı", 
    "Kalite Laboratuvarı",
    "Depo Alanları",
    "Bakım Atölyesi",
    "Ofis Alanları"
  ];
  
  console.log("✅ Locations gönderiliyor");
  res.json(locations);
});

// Çalışan istatistiklerini getir
router.get("/workers/statistics", async (req, res) => {
  console.log("📊 Worker statistics istendi");

  try {
    // Veritabanından tüm çalışanları getir
    const workers = await Worker.findAll();
    
    // Temel istatistikler
    const totalWorkers = workers.length;
    const activeWorkers = workers.filter(w => w.status === 'active').length;
    
    // Bu ay eklenen çalışanlar
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newWorkersThisMonth = workers.filter(w => 
      new Date(w.createdAt) >= thisMonth
    ).length;
    
    // Ortalama uyum oranı hesapla
    const totalCompliance = workers.reduce((sum, w) => sum + (w.complianceRate || 0), 0);
    const averageCompliance = totalWorkers > 0 ? Math.round(totalCompliance / totalWorkers * 10) / 10 : 0;
    
    // Bu ay toplam ihlaller
    const totalViolations = workers.reduce((sum, w) => sum + (w.monthlyViolations || 0), 0);
    
    // Departman istatistikleri
    const departmentStats = {};
    workers.forEach(worker => {
      const dept = worker.department || 'Bilinmeyen';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { workers: 0, totalCompliance: 0 };
      }
      departmentStats[dept].workers++;
      departmentStats[dept].totalCompliance += (worker.complianceRate || 0);
    });
    
    const departmentStatsArray = Object.keys(departmentStats).map(dept => ({
      department: dept,
      workers: departmentStats[dept].workers,
      compliance: Math.round(departmentStats[dept].totalCompliance / departmentStats[dept].workers * 10) / 10
    }));
    
    // Lokasyon istatistikleri
    const locationStats = {};
    workers.forEach(worker => {
      const loc = worker.location || 'Bilinmeyen';
      if (!locationStats[loc]) {
        locationStats[loc] = { workers: 0, totalCompliance: 0 };
      }
      locationStats[loc].workers++;
      locationStats[loc].totalCompliance += (worker.complianceRate || 0);
    });
    
    const locationStatsArray = Object.keys(locationStats).map(loc => ({
      location: loc,
      workers: locationStats[loc].workers,
      compliance: Math.round(locationStats[loc].totalCompliance / locationStats[loc].workers * 10) / 10
    }));

    const stats = {
      totalWorkers,
      activeWorkers,
      averageCompliance,
      totalViolations,
      newWorkersThisMonth,
      complianceChange: 2.3, // Bu değer trend analizi gerektirir, şimdilik sabit
      violationChange: -3,   // Bu değer trend analizi gerektirir, şimdilik sabit
      departmentStats: departmentStatsArray,
      locationStats: locationStatsArray,
    };

    console.log("✅ Worker statistics gönderiliyor:", {
      totalWorkers,
      activeWorkers,
      averageCompliance
    });
    res.json(stats);
    
  } catch (error) {
    console.error("❌ Worker statistics hatası:", error);
    
    // Hata durumunda varsayılan değerler
    const fallbackStats = {
      totalWorkers: 0,
      activeWorkers: 0,
      averageCompliance: 0,
      totalViolations: 0,
      newWorkersThisMonth: 0,
      complianceChange: 0,
      violationChange: 0,
      departmentStats: [],
      locationStats: [],
    };
    
    res.json(fallbackStats);
  }
});

// Çalışan geçmişi
router.get("/workers/history", (req, res) => {
  console.log("📋 Worker history istendi, params:", req.query);

  const mockHistory = [
    {
      id: 1,
      type: "violation",
      title: "PPE İhlali",
      description: "Güvenlik gözlüğü takılmamış",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      details: { location: "Ana Üretim Hattı", severity: "Orta" },
    },
    {
      id: 2,
      type: "training",
      title: "Güvenlik Eğitimi Tamamlandı",
      description: "Temel İş Güvenliği eğitimi başarıyla tamamlandı",
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      details: { duration: "4 saat", score: "95" },
    },
    {
      id: 3,
      type: "ppe",
      title: "PPE Atandı",
              description: "Yeni güvenlik eldiveni atandı",
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      details: { type: "Eldiven", condition: "Yeni" },
    },
  ];

  console.log("✅ Worker history gönderiliyor:", mockHistory.length, "kayıt");
  res.json(mockHistory);
});

// PPE atama
router.post("/workers/assign-ppe", async (req, res) => {
  console.log("🦺 PPE atanıyor:", req.body);

  try {
    const { workerId, ppeTypes, assignmentDate, notes } = req.body;

    // Çalışanı veritabanından getir
    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Çalışan bulunamadı" });
    }

    // Mevcut PPE listesini al
    const currentPPE = worker.assignedPPE || [];
    
    // Yeni PPE'leri ekle
    const newPPEItems = ppeTypes.map(type => ({
      type,
      status: 'assigned',
      assignedDate: assignmentDate || new Date().toISOString().split('T')[0],
      lastCheck: new Date().toISOString().split('T')[0],
      condition: 'good',
      notes: notes || ''
    }));

    // Mevcut PPE'lerle birleştir (aynı tip varsa güncelle)
    const updatedPPE = [...currentPPE];
    
    newPPEItems.forEach(newPPE => {
      const existingIndex = updatedPPE.findIndex(ppe => ppe.type === newPPE.type);
      if (existingIndex > -1) {
        // Mevcut PPE'yi güncelle
        updatedPPE[existingIndex] = { ...updatedPPE[existingIndex], ...newPPE };
      } else {
        // Yeni PPE ekle
        updatedPPE.push(newPPE);
      }
    });

    // Veritabanında güncelle
    await worker.update({ assignedPPE: updatedPPE });

    console.log(`✅ ${worker.name} için ${ppeTypes.length} PPE atandı:`, ppeTypes.join(', '));
    
    res.json({
      success: true,
      message: "PPE başarıyla atandı",
      workerId,
      workerName: worker.name,
      assignedPPE: ppeTypes,
      assignmentDate: assignmentDate || new Date().toISOString().split('T')[0],
      totalPPE: updatedPPE.length
    });

  } catch (error) {
    console.error("❌ PPE atama hatası:", error);
    res.status(500).json({ 
      error: "PPE atama başarısız", 
      message: error.message 
    });
  }
});

// Çalışan dışa aktarma
router.post("/workers/export", async (req, res) => {
  console.log("📊 Workers export istendi, filters:", req.body.filters);

  try {
    // Veritabanından çalışanları getir
    const workers = await Worker.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Excel için veri hazırla
    const excelData = workers.map(worker => {
      const workerData = typeof worker.toJSON === 'function' ? worker.toJSON() : worker;
      
      return {
        'ID': workerData.id,
        'Çalışan ID': workerData.workerId || '',
        'Ad Soyad': workerData.name || '',
        'E-posta': workerData.email || '',
        'Telefon': workerData.phone || '',
        'Departman': workerData.department || '',
        'Lokasyon': workerData.location || '',
        'Pozisyon': workerData.position || '',
        'Başlangıç Tarihi': workerData.startDate || '',
        'Durum': workerData.status === 'active' ? 'Aktif' : 'Pasif',
        'Yönetici ID': workerData.managerId || '',
        'Uyum Oranı (%)': workerData.complianceRate || 0,
        'Aylık İhlaller': workerData.monthlyViolations || 0,
        'Son İhlaller': workerData.recentViolations || 0,
        'Güvenlik Skoru': workerData.safetyScore || 0,
        'Eğitim Durumu': workerData.trainingStatus === 'completed' ? 'Tamamlandı' : 'Devam Ediyor',
        'Tamamlanan Eğitimler': workerData.completedTrainings || 0,
        'Notlar': workerData.notes || '',
        'Atanan PPE': workerData.assignedPPE ? 
          workerData.assignedPPE.map(ppe => ppe.type).join(', ') : '',
        'Oluşturma Tarihi': workerData.createdAt ? 
          new Date(workerData.createdAt).toLocaleDateString('tr-TR') : '',
        'Güncelleme Tarihi': workerData.updatedAt ? 
          new Date(workerData.updatedAt).toLocaleDateString('tr-TR') : ''
      };
    });

    // Eğer veri yoksa örnek veri ekle
    if (excelData.length === 0) {
      excelData.push({
        'ID': 1,
        'Çalışan ID': 'EMP001',
        'Ad Soyad': 'Örnek Çalışan',
        'E-posta': 'ornek@sirket.com',
        'Telefon': '+90 555 123 45 67',
        'Departman': 'Üretim',
        'Lokasyon': 'Ana Üretim Hattı',
        'Pozisyon': 'Operatör',
        'Başlangıç Tarihi': '2023-01-15',
        'Durum': 'Aktif',
        'Yönetici ID': '1',
        'Uyum Oranı (%)': 92.5,
        'Aylık İhlaller': 2,
        'Son İhlaller': 1,
        'Güvenlik Skoru': 85,
        'Eğitim Durumu': 'Tamamlandı',
        'Tamamlanan Eğitimler': 8,
        'Notlar': 'Güvenilir çalışan',
        'Atanan PPE': 'Baret, Eldiven, Yelek',
        'Oluşturma Tarihi': new Date().toLocaleDateString('tr-TR'),
        'Güncelleme Tarihi': new Date().toLocaleDateString('tr-TR')
      });
    }

    // Excel workbook oluştur
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Sütun genişliklerini ayarla
    const columnWidths = [
      { wch: 5 },   // ID
      { wch: 12 },  // Çalışan ID
      { wch: 20 },  // Ad Soyad
      { wch: 25 },  // E-posta
      { wch: 15 },  // Telefon
      { wch: 15 },  // Departman
      { wch: 20 },  // Lokasyon
      { wch: 15 },  // Pozisyon
      { wch: 12 },  // Başlangıç Tarihi
      { wch: 8 },   // Durum
      { wch: 10 },  // Yönetici ID
      { wch: 12 },  // Uyum Oranı
      { wch: 12 },  // Aylık İhlaller
      { wch: 12 },  // Son İhlaller
      { wch: 12 },  // Güvenlik Skoru
      { wch: 15 },  // Eğitim Durumu
      { wch: 15 },  // Tamamlanan Eğitimler
      { wch: 30 },  // Notlar
      { wch: 25 },  // Atanan PPE
      { wch: 15 },  // Oluşturma Tarihi
      { wch: 15 }   // Güncelleme Tarihi
    ];
    worksheet['!cols'] = columnWidths;

    // Worksheet'i workbook'a ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, "Çalışanlar");

    // Excel buffer oluştur
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Response headers ayarla
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition", 
      `attachment; filename=calisanlar_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    console.log("✅ Workers export hazırlandı:", excelData.length, "kayıt");
    res.send(excelBuffer);

  } catch (error) {
    console.error("❌ Workers export hatası:", error);
    res.status(500).json({ 
      error: "Excel dosyası oluşturulamadı", 
      message: error.message 
    });
  }
});

// İçe aktarma şablonu
router.get("/workers/import/template", (req, res) => {
  console.log("📋 Import template istendi");

  try {
    // Şablon için örnek veri
    const templateData = [
      {
        'Çalışan ID': 'EMP001',
        'Ad Soyad': 'Örnek Çalışan',
        'E-posta': 'ornek@sirket.com',
        'Telefon': '+90 555 123 45 67',
        'Departman': 'Üretim',
        'Lokasyon': 'Ana Üretim Hattı',
        'Pozisyon': 'Operatör',
        'Başlangıç Tarihi': '2023-01-15',
        'Durum': 'active',
        'Yönetici ID': '1',
        'Notlar': 'Örnek not'
      }
    ];

    // Excel workbook oluştur
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Sütun genişliklerini ayarla
    const columnWidths = [
      { wch: 12 },  // Çalışan ID
      { wch: 20 },  // Ad Soyad
      { wch: 25 },  // E-posta
      { wch: 15 },  // Telefon
      { wch: 15 },  // Departman
      { wch: 20 },  // Lokasyon
      { wch: 15 },  // Pozisyon
      { wch: 12 },  // Başlangıç Tarihi
      { wch: 8 },   // Durum
      { wch: 10 },  // Yönetici ID
      { wch: 30 }   // Notlar
    ];
    worksheet['!cols'] = columnWidths;

    // Worksheet'i workbook'a ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, "Çalışan Şablonu");

    // Excel buffer oluştur
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Response headers ayarla
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=calisanlar_sablonu.xlsx"
    );

    console.log("✅ Import template hazırlandı");
    res.send(excelBuffer);

  } catch (error) {
    console.error("❌ Import template hatası:", error);
    res.status(500).json({ 
      error: "Şablon dosyası oluşturulamadı", 
      message: error.message 
    });
  }
});

// İçe aktarma önizleme
router.post("/workers/import/preview", fileUpload.single('file'), async (req, res) => {
  console.log("🔍 Import preview istendi");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Dosya yüklenmedi" });
    }

    let workbook;
    let worksheet;
    
    // Dosya tipine göre işle
    if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        req.file.originalname.endsWith('.xlsx')) {
      // Excel dosyası
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
    } else if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      // CSV dosyası
      const csvData = req.file.buffer.toString('utf8');
      workbook = XLSX.read(csvData, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
    } else {
      return res.status(400).json({ error: "Desteklenmeyen dosya formatı. Sadece .xlsx ve .csv dosyaları kabul edilir." });
    }

    // Excel/CSV verisini JSON'a çevir
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      return res.status(400).json({ error: "Dosya boş veya geçersiz format" });
    }

    // Mevcut departman ve lokasyonları getir
    const departments = ['Üretim', 'Kalite Kontrol', 'Bakım-Onarım', 'Depo', 'İdari', 'Güvenlik'];
    const locations = ['Ana Üretim Hattı', 'Kalite Laboratuvarı', 'Bakım Atölyesi', 'Hammadde Deposu', 'Montaj Alanı', 'Paketleme Alanı', 'İdari Ofis', 'Güvenlik Noktası'];

    // Verileri doğrula ve hataları tespit et
    const previewData = jsonData.map((row, index) => {
      const errors = [];
      
      // Zorunlu alanları kontrol et
      if (!row['Ad Soyad'] || row['Ad Soyad'].toString().trim() === '') {
        errors.push('Ad Soyad alanı zorunludur');
      }
      
      if (!row['Çalışan ID'] || row['Çalışan ID'].toString().trim() === '') {
        errors.push('Çalışan ID alanı zorunludur');
      }
      
      if (!row['E-posta'] || row['E-posta'].toString().trim() === '') {
        errors.push('E-posta alanı zorunludur');
      } else {
        // E-posta formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row['E-posta'].toString().trim())) {
          errors.push('Geçersiz e-posta formatı');
        }
      }
      
      // Departman kontrolü
      if (row['Departman'] && !departments.includes(row['Departman'].toString().trim())) {
        errors.push(`Geçersiz departman: ${row['Departman']}. Geçerli departmanlar: ${departments.join(', ')}`);
      }
      
      // Lokasyon kontrolü
      if (row['Lokasyon'] && !locations.includes(row['Lokasyon'].toString().trim())) {
        errors.push(`Geçersiz lokasyon: ${row['Lokasyon']}. Geçerli lokasyonlar: ${locations.join(', ')}`);
      }
      
      // Durum kontrolü
      if (row['Durum'] && !['active', 'inactive', 'suspended'].includes(row['Durum'].toString().toLowerCase())) {
        errors.push('Durum alanı active, inactive veya suspended olmalıdır');
      }
      
      // Tarih formatı kontrolü
      if (row['Başlangıç Tarihi']) {
        const dateStr = row['Başlangıç Tarihi'].toString();
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          errors.push('Geçersiz başlangıç tarihi formatı (YYYY-MM-DD bekleniyor)');
        }
      }

      return {
        rowNumber: index + 2, // Excel'de başlık satırı 1, veri 2'den başlar
        name: row['Ad Soyad'] ? row['Ad Soyad'].toString().trim() : '',
        workerId: row['Çalışan ID'] ? row['Çalışan ID'].toString().trim() : '',
        email: row['E-posta'] ? row['E-posta'].toString().trim() : '',
        phone: row['Telefon'] ? row['Telefon'].toString().trim() : '',
        department: row['Departman'] ? row['Departman'].toString().trim() : '',
        location: row['Lokasyon'] ? row['Lokasyon'].toString().trim() : '',
        position: row['Pozisyon'] ? row['Pozisyon'].toString().trim() : '',
        startDate: row['Başlangıç Tarihi'] ? row['Başlangıç Tarihi'].toString().trim() : '',
        status: row['Durum'] ? row['Durum'].toString().toLowerCase() : 'active',
        managerId: row['Yönetici ID'] ? parseInt(row['Yönetici ID']) || 1 : 1,
        notes: row['Notlar'] ? row['Notlar'].toString().trim() : '',
        errors: errors
      };
    });

    console.log(`✅ Import preview hazırlandı: ${previewData.length} kayıt, ${previewData.filter(r => r.errors.length === 0).length} geçerli`);
    res.json(previewData);

  } catch (error) {
    console.error("❌ Import preview hatası:", error);
    res.status(500).json({ 
      error: "Dosya işlenemedi", 
      message: error.message 
    });
  }
});

// İçe aktarma
router.post("/workers/import", async (req, res) => {
  console.log("📥 Workers import başlıyor:", req.body.workers?.length, "kayıt");

  try {
    const { workers } = req.body;
    
    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: "Geçerli çalışan verisi bulunamadı" });
    }

    let imported = 0;
    let failed = 0;
    const errors = [];

    // Her çalışanı veritabanına ekle
    for (const workerData of workers) {
      try {
        // Çalışan ID'sinin benzersiz olduğunu kontrol et
        const existingWorker = await Worker.findOne({ 
          where: { workerId: workerData.workerId } 
        });
        
        if (existingWorker) {
          failed++;
          errors.push({
            workerId: workerData.workerId,
            name: workerData.name,
            error: "Bu çalışan ID'si zaten mevcut"
          });
          continue;
        }

        // E-posta benzersizliğini kontrol et
        const existingEmail = await Worker.findOne({ 
          where: { email: workerData.email } 
        });
        
        if (existingEmail) {
          failed++;
          errors.push({
            workerId: workerData.workerId,
            name: workerData.name,
            error: "Bu e-posta adresi zaten kullanılıyor"
          });
          continue;
        }

        // Yeni çalışan oluştur
        const newWorker = await Worker.create({
          name: workerData.name,
          workerId: workerData.workerId,
          email: workerData.email,
          phone: workerData.phone || '',
          department: workerData.department || 'Üretim',
          location: workerData.location || 'Ana Üretim Hattı',
          position: workerData.position || 'Operatör',
          startDate: workerData.startDate || new Date().toISOString().split('T')[0],
          status: workerData.status || 'active',
          managerId: workerData.managerId || 1,
          notes: workerData.notes || '',
          assignedPPE: [],
          complianceRate: 100,
          monthlyViolations: 0,
          safetyScore: 100,
          trainingStatus: 'pending',
          completedTrainings: 0
        });

        imported++;
        console.log(`✅ Çalışan eklendi: ${newWorker.name} (${newWorker.workerId})`);

      } catch (error) {
        failed++;
        errors.push({
          workerId: workerData.workerId,
          name: workerData.name,
          error: error.message
        });
        console.error(`❌ Çalışan eklenemedi: ${workerData.name}`, error.message);
      }
    }

    console.log(`✅ Workers import tamamlandı: ${imported} başarılı, ${failed} başarısız`);
    
    res.json({
      message: "İçe aktarma tamamlandı",
      imported: imported,
      failed: failed,
      errors: errors,
      total: workers.length
    });

  } catch (error) {
    console.error("❌ Workers import hatası:", error);
    res.status(500).json({ 
      error: "İçe aktarma başarısız", 
      message: error.message 
    });
  }
});

// Tüm çalışanları getir (role parametresi ile managers da döndürülebilir)
router.get("/workers", async (req, res) => {
  // Eğer role=manager query'si varsa sadece yöneticileri döndür
  if (req.query.role === "manager") {
    console.log("👔 Managers istendi");

    const mockManagers = [
      {
        id: 1,
        name: "Ali Veli",
        position: "Üretim Müdürü",
        department: "Üretim",
      },
      {
        id: 2,
        name: "Zeynep Ak",
        position: "Kalite Müdürü",
        department: "Kalite Kontrol",
      },
      {
        id: 3,
        name: "Hasan Öz",
        position: "Bakım Müdürü",
        department: "Bakım-Onarım",
      },
      { id: 4, name: "Elif Kara", position: "Depo Müdürü", department: "Depo" },
    ];

    console.log("✅ Managers gönderiliyor:", mockManagers.length, "adet");
    return res.json(mockManagers);
  }

  console.log("👥 Workers listesi istendi");

  try {
    // Veritabanından çalışanları getir
    const workers = await Worker.findAll({
      order: [['createdAt', 'DESC']]
    });

    if (workers.length === 0) {
      // Eğer veritabanında çalışan yoksa mock data döndür
      const mockWorkers = [
        {
          id: 1,
          name: "Ahmet Yılmaz",
          workerId: "EMP001",
          email: "ahmet.yilmaz@sirket.com",
          phone: "+90 555 123 45 67",
          department: "Üretim",
          location: "Ana Üretim Hattı",
          position: "Üretim Operatörü",
          startDate: "2023-01-15",
          status: "active",
          managerId: 1,
          complianceRate: 92.5,
          monthlyViolations: 2,
          recentViolations: 1,
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          safetyScore: 85,
          trainingStatus: "completed",
          completedTrainings: 8,
          notes: "Güvenilir çalışan, PPE kullanımında dikkatli.",
          photo: null,
          assignedPPE: [
            {
              type: "Baret",
              status: "assigned",
              assignedDate: "2023-01-15",
              lastCheck: "2025-06-01",
              condition: "good",
            },
            {
              type: "Eldiven",
              status: "assigned",
              assignedDate: "2023-01-15",
              lastCheck: "2025-06-01",
              condition: "fair",
            },
            {
              type: "Yelek",
              status: "assigned",
              assignedDate: "2023-01-15",
              lastCheck: "2025-06-01",
              condition: "good",
            },
          ],
          recentViolations: [
            {
              id: 1,
              type: "Eksik PPE",
              description: "Solunum maskesi takılmamış",
              timestamp: new Date(
                Date.now() - 3 * 24 * 60 * 60 * 1000
              ).toISOString(),
              location: "Ana Üretim Hattı",
              status: "resolved",
            },
          ],
        },
        {
          id: 2,
          name: "Fatma Demir",
          workerId: "EMP002",
          email: "fatma.demir@sirket.com",
          phone: "+90 555 234 56 78",
          department: "Kalite Kontrol",
          location: "Kalite Laboratuvarı",
          position: "Kalite Kontrol Uzmanı",
          startDate: "2022-08-20",
          status: "active",
          managerId: 2,
          complianceRate: 98.1,
          monthlyViolations: 0,
          recentViolations: 0,
          lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          safetyScore: 95,
          trainingStatus: "completed",
          completedTrainings: 12,
          notes: "Örnek çalışan, güvenlik konularında lider.",
          photo: null,
          assignedPPE: [
            {
              type: "Baret",
              status: "assigned",
              assignedDate: "2022-08-20",
              lastCheck: "2025-06-01",
              condition: "excellent",
            },
            {
              type: "Eldiven",
              status: "assigned",
              assignedDate: "2022-08-20",
              lastCheck: "2025-06-01",
              condition: "good",
            },
            {
              type: "Maske",
              status: "assigned",
              assignedDate: "2022-08-20",
              lastCheck: "2025-06-01",
              condition: "good",
            },
          ],
          recentViolations: [],
        },
        {
          id: 3,
          name: "Mehmet Kaya",
          workerId: "EMP003",
          email: "mehmet.kaya@sirket.com",
          phone: "+90 555 345 67 89",
          department: "Bakım-Onarım",
          location: "Bakım Atölyesi",
          position: "Bakım Teknisyeni",
          startDate: "2023-03-10",
          status: "active",
          managerId: 3,
          complianceRate: 76.3,
          monthlyViolations: 4,
          recentViolations: 2,
          lastSeen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          safetyScore: 68,
          trainingStatus: "in-progress",
          completedTrainings: 4,
          notes: "Performans gelişiyor, düzenli takip gerekiyor.",
          photo: null,
          assignedPPE: [
            {
              type: "Baret",
              status: "assigned",
              assignedDate: "2023-03-10",
              lastCheck: "2025-06-01",
              condition: "fair",
            },
            {
              type: "Eldiven",
              status: "assigned",
              assignedDate: "2023-03-10",
              lastCheck: "2025-06-01",
              condition: "good",
            },
            {
              type: "Yelek",
              status: "missing",
              assignedDate: "2023-03-10",
              lastCheck: "2025-05-15",
              condition: "poor",
            },
          ],
          recentViolations: [
            {
              id: 2,
              type: "Eksik PPE",
              description: "Güvenlik yeleği takılmamış",
              timestamp: new Date(
                Date.now() - 1 * 24 * 60 * 60 * 1000
              ).toISOString(),
              location: "Bakım Atölyesi",
              status: "open",
            },
          ],
        },
        {
          id: 4,
          name: "Ayşe Çelik",
          workerId: "EMP004",
          email: "ayse.celik@sirket.com",
          phone: "+90 555 456 78 90",
          department: "Depo",
          location: "Hammadde Deposu",
          position: "Depo Sorumlusu",
          startDate: "2023-05-22",
          status: "active",
          managerId: 4,
          complianceRate: 89.7,
          monthlyViolations: 1,
          recentViolations: 1,
          lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          safetyScore: 82,
          trainingStatus: "completed",
          completedTrainings: 6,
          notes: "İyi performans, ara sıra hatırlatma gerekiyor.",
          photo: null,
          assignedPPE: [
            {
              type: "Baret",
              status: "assigned",
              assignedDate: "2023-05-22",
              lastCheck: "2025-06-01",
              condition: "good",
            },
            {
              type: "Yelek",
              status: "assigned",
              assignedDate: "2023-05-22",
              lastCheck: "2025-06-01",
              condition: "excellent",
            },
          ],
          recentViolations: [
            {
              id: 4,
              type: "Eksik PPE",
              description: "Güvenlik bareti takılmamış",
              timestamp: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000
              ).toISOString(),
              location: "Hammadde Deposu",
              status: "resolved",
            },
          ],
        },
        {
          id: 5,
          name: "Can Özkan",
          workerId: "EMP005",
          email: "can.ozkan@sirket.com",
          phone: "+90 555 567 89 01",
          department: "Üretim",
          location: "Montaj Alanı",
          position: "Montaj Operatörü",
          startDate: "2024-01-08",
          status: "training",
          managerId: 1,
          complianceRate: 65.4,
          monthlyViolations: 8,
          recentViolations: 4,
          lastSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          safetyScore: 45,
          trainingStatus: "in-progress",
          completedTrainings: 2,
          notes: "Yeni çalışan, yoğun eğitim programında.",
          photo: null,
          assignedPPE: [
            {
              type: "Baret",
              status: "assigned",
              assignedDate: "2024-01-08",
              lastCheck: "2025-06-01",
              condition: "good",
            },
            {
              type: "Eldiven",
              status: "assigned",
              assignedDate: "2024-01-08",
              lastCheck: "2025-06-01",
              condition: "fair",
            },
          ],
          recentViolations: [
            {
              id: 5,
              type: "Eksik PPE",
              description: "Solunum maskesi takılmamış",
              timestamp: new Date(
                Date.now() - 1 * 24 * 60 * 60 * 1000
              ).toISOString(),
              location: "Montaj Alanı",
              status: "open",
            },
          ],
        },
      ];

      console.log("✅ Workers mock data gönderiliyor:", mockWorkers.length, "adet");
      return res.json(mockWorkers);
    }

    // Veritabanından gelen çalışanları formatla ve desteklenmeyen PPE'leri temizle
    const formattedWorkers = workers.map(worker => {
      // Sadece desteklenen PPE tiplerini filtrele
      const supportedPPETypes = ['Baret', 'Maske', 'Eldiven', 'Yelek'];
      const cleanedPPE = worker.assignedPPE ? 
        worker.assignedPPE.filter(ppe => supportedPPETypes.includes(ppe.type)) : [];

      return {
        id: worker.id,
        name: worker.name,
        workerId: worker.workerId,
        email: worker.email,
        phone: worker.phone,
        department: worker.department,
        location: worker.location,
        position: worker.position,
        startDate: worker.startDate,
        status: worker.status,
        managerId: worker.managerId,
        complianceRate: worker.complianceRate || Math.floor(Math.random() * 30) + 70,
        monthlyViolations: worker.monthlyViolations || 0,
        recentViolations: worker.recentViolations || 0,
        lastSeen: worker.lastSeen || new Date().toISOString(),
        safetyScore: worker.safetyScore || Math.floor(Math.random() * 40) + 60,
        trainingStatus: worker.trainingStatus || 'completed',
        completedTrainings: worker.completedTrainings || Math.floor(Math.random() * 10) + 1,
        notes: worker.notes || '',
        photo: worker.photo,
        assignedPPE: cleanedPPE,
        recentViolations: []
      };
    });

    console.log("✅ Workers veritabanından gönderiliyor:", formattedWorkers.length, "adet");
    res.json(formattedWorkers);

  } catch (error) {
    console.error("❌ Workers listesi hatası:", error);
    res.status(500).json({ 
      error: "Çalışan listesi alınamadı", 
      message: error.message 
    });
  }
});

// Tekil çalışan getir
router.get("/workers/:id", (req, res) => {
  console.log("👤 Worker detayı istendi, ID:", req.params.id);

  // Bu normalde veritabanından gelecek
  const worker = {
    id: parseInt(req.params.id),
    name: "Örnek Çalışan",
    workerId: "EMP" + req.params.id.padStart(3, "0"),
    // ... diğer detaylar
  };

  console.log("✅ Worker detayı gönderiliyor");
  res.json(worker);
});

// Yeni çalışan ekle
router.post("/workers", async (req, res) => {
  console.log("➕ Yeni worker ekleniyor:", req.body);

  try {
    const newWorker = await Worker.create({
      workerId: req.body.workerId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      department: req.body.department,
      position: req.body.position,
      location: req.body.location,
      manager: req.body.manager,
      status: req.body.status || 'active',
      photo: req.body.photo,
      assignedPPE: req.body.assignedPPE || [],
      complianceRate: Math.floor(Math.random() * 30) + 70, // 70-100 arası random
      lastSeen: new Date(),
      monthlyViolations: Math.floor(Math.random() * 5), // 0-4 arası random
      totalViolations: Math.floor(Math.random() * 20), // 0-19 arası random
      trainingCompleted: Math.random() > 0.3, // %70 ihtimalle true
      notes: req.body.notes
    });

    console.log("✅ Worker veritabanına eklendi:", newWorker.id);
    res.status(201).json(newWorker);
  } catch (error) {
    console.error("❌ Worker ekleme hatası:", error);
    res.status(500).json({ 
      error: "Çalışan eklenemedi", 
      message: error.message 
    });
  }
});

// Çalışan güncelle
router.put("/workers/:id", async (req, res) => {
  console.log("✏️ Worker güncelleniyor, ID:", req.params.id, "Data:", req.body);

  try {
    const [updatedCount] = await Worker.update({
      workerId: req.body.workerId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      department: req.body.department,
      position: req.body.position,
      location: req.body.location,
      startDate: req.body.startDate,
      manager: req.body.manager,
      status: req.body.status,
      photo: req.body.photo,
      assignedPPE: req.body.assignedPPE,
      notes: req.body.notes
    }, {
      where: { id: req.params.id }
    });

    if (updatedCount > 0) {
      const updatedWorker = await Worker.findByPk(req.params.id);
      console.log("✅ Worker veritabanında güncellendi:", req.params.id);
      res.json(updatedWorker);
    } else {
      console.log("❌ Worker bulunamadı:", req.params.id);
      res.status(404).json({ error: "Çalışan bulunamadı" });
    }
  } catch (error) {
    console.error("❌ Worker güncelleme hatası:", error);
    res.status(500).json({ 
      error: "Çalışan güncellenemedi", 
      message: error.message 
    });
  }
});

// Çalışan pasifleştir
router.put("/workers/:id/deactivate", async (req, res) => {
  console.log("🚫 Worker pasifleştiriliyor, ID:", req.params.id);

  try {
    const [updatedCount] = await Worker.update({
      status: 'inactive'
    }, {
      where: { id: req.params.id }
    });

    if (updatedCount > 0) {
      console.log("✅ Worker pasifleştirildi:", req.params.id);
      res.json({ message: "Çalışan pasifleştirildi", id: req.params.id });
    } else {
      console.log("❌ Worker bulunamadı:", req.params.id);
      res.status(404).json({ error: "Çalışan bulunamadı" });
    }
  } catch (error) {
    console.error("❌ Worker pasifleştirme hatası:", error);
    res.status(500).json({ 
      error: "Çalışan pasifleştirilemedi", 
      message: error.message 
    });
  }
});

// Çalışan sil
router.delete("/workers/:id", async (req, res) => {
  console.log("🗑️ Worker siliniyor, ID:", req.params.id);

  try {
    const deletedCount = await Worker.destroy({
      where: { id: req.params.id }
    });

    if (deletedCount > 0) {
      console.log("✅ Worker veritabanından silindi:", req.params.id);
      res.json({ message: "Çalışan başarıyla silindi", id: req.params.id });
    } else {
      console.log("❌ Worker bulunamadı:", req.params.id);
      res.status(404).json({ error: "Çalışan bulunamadı" });
    }
  } catch (error) {
    console.error("❌ Worker silme hatası:", error);
    res.status(500).json({ 
      error: "Çalışan silinemedi", 
      message: error.message 
    });
  }
});

// PPE kaldır
router.delete("/workers/:workerId/ppe/:ppeType", async (req, res) => {
  console.log("🗑️ PPE kaldırılıyor:", req.params);

  try {
    const { workerId, ppeType } = req.params;

    // Çalışanı veritabanından getir
    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Çalışan bulunamadı" });
    }

    // Mevcut PPE listesini al
    const currentPPE = worker.assignedPPE || [];
    
    // Belirtilen PPE tipini kaldır
    const updatedPPE = currentPPE.filter(ppe => ppe.type !== decodeURIComponent(ppeType));

    // Veritabanında güncelle
    await worker.update({ assignedPPE: updatedPPE });

    console.log(`✅ ${worker.name} için ${ppeType} kaldırıldı`);
    
    res.json({
      success: true,
      message: "PPE kaldırıldı",
      workerId,
      workerName: worker.name,
      ppeType: decodeURIComponent(ppeType),
      remainingPPE: updatedPPE.length
    });

  } catch (error) {
    console.error("❌ PPE kaldırma hatası:", error);
    res.status(500).json({ 
      error: "PPE kaldırma başarısız", 
      message: error.message 
    });
  }
});

// Desteklenmeyen PPE tiplerini toplu temizle
router.post("/workers/cleanup-unsupported-ppe", async (req, res) => {
  console.log("🧹 Desteklenmeyen PPE tipleri temizleniyor...");

  try {
    // Desteklenen PPE tipleri
    const supportedPPETypes = ['Baret', 'Maske', 'Eldiven', 'Yelek'];
    const unsupportedTypes = ['Gözlük', 'Ayakkabı', 'Kulaklık'];

    // Tüm çalışanları getir
    const workers = await Worker.findAll();
    
    let updatedWorkers = 0;
    let removedPPECount = 0;

    for (const worker of workers) {
      if (worker.assignedPPE && worker.assignedPPE.length > 0) {
        const originalPPECount = worker.assignedPPE.length;
        
        // Sadece desteklenen PPE tiplerini tut
        const filteredPPE = worker.assignedPPE.filter(ppe => 
          supportedPPETypes.includes(ppe.type)
        );
        
        if (filteredPPE.length !== originalPPECount) {
          // PPE listesi değiştiyse güncelle
          worker.assignedPPE = filteredPPE;
          await worker.save();
          
          updatedWorkers++;
          removedPPECount += (originalPPECount - filteredPPE.length);
          
          console.log(`✅ ${worker.name} (${worker.workerId}): ${originalPPECount - filteredPPE.length} PPE kaldırıldı`);
        }
      }
    }

    console.log(`✅ Temizlik tamamlandı: ${updatedWorkers} çalışan güncellendi, ${removedPPECount} PPE kaldırıldı`);
    
    res.json({
      message: "Desteklenmeyen PPE tipleri başarıyla temizlendi",
      updatedWorkers,
      removedPPECount,
      supportedTypes: supportedPPETypes,
      removedTypes: unsupportedTypes
    });
  } catch (error) {
    console.error("❌ PPE temizleme hatası:", error);
    res.status(500).json({ error: "PPE temizleme işlemi başarısız" });
  }
});

// Çalışan raporu oluştur
router.post("/workers/:id/report", async (req, res) => {
  console.log("📄 Worker raporu oluşturuluyor, ID:", req.params.id);

  try {
    // Çalışan bilgilerini veritabanından getir
    const worker = await Worker.findByPk(req.params.id);
    if (!worker) {
      return res.status(404).json({ error: "Çalışan bulunamadı" });
    }

    const workerData = worker.toJSON();
    
    // PDF için HTML template oluştur
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Çalışan Raporu - ${workerData.name}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                color: #333;
                line-height: 1.6;
            }
            .header { 
                text-align: center; 
                border-bottom: 2px solid #2563eb; 
                padding-bottom: 20px; 
                margin-bottom: 30px;
            }
            .header h1 { 
                color: #2563eb; 
                margin: 0;
                font-size: 28px;
            }
            .header p { 
                color: #666; 
                margin: 5px 0;
                font-size: 14px;
            }
            .section { 
                margin-bottom: 25px; 
                padding: 15px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }
            .section h2 { 
                color: #1f2937; 
                border-bottom: 1px solid #e5e7eb; 
                padding-bottom: 8px;
                margin-top: 0;
                font-size: 18px;
            }
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 15px; 
                margin-top: 15px;
            }
            .info-item { 
                padding: 10px;
                background: #f9fafb;
                border-radius: 6px;
            }
            .info-label { 
                font-weight: bold; 
                color: #374151;
                font-size: 14px;
            }
            .info-value { 
                color: #6b7280; 
                margin-top: 4px;
                font-size: 14px;
            }
            .stats-container {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-top: 15px;
            }
            .stat-card {
                text-align: center;
                padding: 15px;
                background: #f0f9ff;
                border-radius: 8px;
                border: 1px solid #bae6fd;
            }
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: #0369a1;
                margin-bottom: 5px;
            }
            .stat-label {
                font-size: 12px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .ppe-list {
                list-style: none;
                padding: 0;
                margin: 15px 0;
            }
            .ppe-item {
                padding: 8px 12px;
                margin: 5px 0;
                background: #ecfdf5;
                border-left: 4px solid #10b981;
                border-radius: 4px;
                font-size: 14px;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 12px;
            }
            .compliance-bar {
                width: 100%;
                height: 20px;
                background: #e5e7eb;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            .compliance-fill {
                height: 100%;
                background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
                width: ${workerData.complianceRate || 0}%;
                transition: width 0.3s ease;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏭 ÇALIŞAN RAPORU</h1>
            <p>Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
        </div>

        <div class="section">
            <h2>👤 Kişisel Bilgiler</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Ad Soyad</div>
                    <div class="info-value">${workerData.name || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Çalışan ID</div>
                    <div class="info-value">${workerData.workerId || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">E-posta</div>
                    <div class="info-value">${workerData.email || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Telefon</div>
                    <div class="info-value">${workerData.phone || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Departman</div>
                    <div class="info-value">${workerData.department || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Lokasyon</div>
                    <div class="info-value">${workerData.location || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Pozisyon</div>
                    <div class="info-value">${workerData.position || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Durum</div>
                    <div class="info-value">${workerData.status === 'active' ? '✅ Aktif' : 
                                                workerData.status === 'inactive' ? '❌ Pasif' : 
                                                workerData.status === 'training' ? '📚 Eğitimde' : 'Belirtilmemiş'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Performans İstatistikleri</h2>
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-number">${workerData.complianceRate || 0}%</div>
                    <div class="stat-label">Uyum Oranı</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${workerData.monthlyViolations || 0}</div>
                    <div class="stat-label">Aylık İhlaller</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${workerData.workingDays || 0}</div>
                    <div class="stat-label">Çalışma Günü</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <div class="info-label">Uyum Oranı Göstergesi</div>
                <div class="compliance-bar">
                    <div class="compliance-fill"></div>
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                    ${workerData.complianceRate >= 90 ? '🟢 Mükemmel' : 
                      workerData.complianceRate >= 75 ? '🟡 İyi' : 
                      workerData.complianceRate >= 50 ? '🟠 Orta' : '🔴 Düşük'}
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🦺 Atanmış PPE Ekipmanları</h2>
            ${workerData.assignedPPE && workerData.assignedPPE.length > 0 ? `
                <ul class="ppe-list">
                    ${workerData.assignedPPE.map(ppe => `
                        <li class="ppe-item">
                            <strong>${ppe.type}</strong> - 
                            ${ppe.status === 'assigned' ? '✅ Atanmış' : 
                              ppe.status === 'maintenance' ? '🔧 Bakımda' : 
                              ppe.status === 'lost' ? '❌ Kayıp' : 'Bilinmiyor'}
                            ${ppe.assignedDate ? `(${new Date(ppe.assignedDate).toLocaleDateString('tr-TR')})` : ''}
                        </li>
                    `).join('')}
                </ul>
            ` : '<p style="color: #6b7280; font-style: italic;">Henüz PPE ekipmanı atanmamış.</p>'}
        </div>

        <div class="section">
            <h2>📝 Notlar ve Açıklamalar</h2>
            <div style="padding: 15px; background: #f9fafb; border-radius: 6px; min-height: 60px;">
                ${workerData.notes || 'Herhangi bir not bulunmamaktadır.'}
            </div>
        </div>

        <div class="section">
            <h2>📅 Tarihçe Bilgileri</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">İşe Başlama Tarihi</div>
                    <div class="info-value">${workerData.startDate ? 
                        new Date(workerData.startDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Kayıt Tarihi</div>
                    <div class="info-value">${workerData.createdAt ? 
                        new Date(workerData.createdAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Son Güncelleme</div>
                    <div class="info-value">${workerData.updatedAt ? 
                        new Date(workerData.updatedAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Çalışma Süresi</div>
                    <div class="info-value">${workerData.workingDays || 0} gün</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Bu rapor PPE Detection System tarafından otomatik olarak oluşturulmuştur.</p>
            <p>Rapor ID: WR-${workerData.id}-${Date.now()}</p>
        </div>
    </body>
    </html>`;

    // Puppeteer ile PDF oluştur
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();

    // PDF response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${workerData.name.replace(/\s+/g, '_')}_raporu.pdf`
    );

    console.log("✅ Worker raporu oluşturuldu:", workerData.name);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("❌ Worker raporu oluşturulamadı:", error);
    res.status(500).json({ 
      error: "Rapor oluşturulamadı", 
      message: error.message 
    });
  }
});

// ================================
// VIOLATIONS ENDPOINTS (Mevcut)
// ================================

// Violations stats (önceki koddan)
router.get("/violations", (req, res) => {
  console.log("⚠️ Violations listesi istendi");

  // Global array'i başlat (ilk çalıştırmada)
  if (!global.mockViolations) {
    global.mockViolations = [
      {
        id: 1,
        worker_id: "EMP001",
        worker_name: "Ahmet Yılmaz",
        violation_type: "Eksik PPE",
        description: "Güvenlik gözlüğü takılmamış",
        location: "Ana Üretim Hattı",
        timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 saat önce
        severity: "medium",
        status: "open",
        image_url: null,
        confidence: 0.92,
      },
      {
        id: 2,
        worker_id: "EMP003",
        worker_name: "Mehmet Kaya",
        violation_type: "Yanlış PPE",
        description: "Uygun olmayan eldiven kullanımı",
        location: "Bakım Atölyesi",
        timestamp: Math.floor(Date.now() / 1000) - 7200, // 2 saat önce
        severity: "high",
        status: "resolved",
        image_url: null,
        confidence: 0.87,
      },
      {
        id: 3,
        worker_id: "EMP002",
        worker_name: "Fatma Demir",
        violation_type: "Eksik PPE",
        description: "Güvenlik bareti takılmamış",
        location: "Kalite Laboratuvarı",
        timestamp: Math.floor(Date.now() / 1000) - 10800, // 3 saat önce
        severity: "low",
        status: "open",
        image_url: null,
        confidence: 0.78,
      },
      {
        id: 4,
        worker_id: "EMP004",
        worker_name: "Ayşe Çelik",
        violation_type: "Eksik PPE",
        description: "Güvenlik yeleği takılmamış",
        location: "Hammadde Deposu",
        timestamp: Math.floor(Date.now() / 1000) - 14400, // 4 saat önce
        severity: "medium",
        status: "resolved",
        image_url: null,
        confidence: 0.95,
      },
      {
        id: 5,
        worker_id: "EMP005",
        worker_name: "Can Özkan",
        violation_type: "Yanlış PPE",
        description: "Solunum maskesi takılmamış",
        location: "Montaj Alanı",
        timestamp: Math.floor(Date.now() / 1000) - 18000, // 5 saat önce
        severity: "high",
        status: "open",
        image_url: null,
        confidence: 0.89,
      },
      {
        id: 6,
        worker_id: "EMP001",
        worker_name: "Ahmet Yılmaz",
        violation_type: "Eksik PPE",
        description: "İş eldiveni takılmamış",
        location: "Ana Üretim Hattı",
        timestamp: Math.floor(Date.now() / 1000) - 21600, // 6 saat önce
        severity: "medium",
        status: "resolved",
        image_url: null,
        confidence: 0.91,
      },
      {
        id: 7,
        worker_id: "EMP003",
        worker_name: "Mehmet Kaya",
        violation_type: "Eksik PPE",
        description: "Solunum maskesi takılmamış",
        location: "Bakım Atölyesi",
        timestamp: Math.floor(Date.now() / 1000) - 25200, // 7 saat önce
        severity: "high",
        status: "open",
        image_url: null,
        confidence: 0.86,
      },
      {
        id: 8,
        worker_id: "EMP002",
        worker_name: "Fatma Demir",
        violation_type: "Yanlış PPE",
        description: "Hasarlı güvenlik maskesi",
        location: "Kalite Laboratuvarı",
        timestamp: Math.floor(Date.now() / 1000) - 28800, // 8 saat önce
        severity: "low",
        status: "resolved",
        image_url: null,
        confidence: 0.73,
      },
      {
        id: 9,
        worker_id: "EMP004",
        worker_name: "Ayşe Çelik",
        violation_type: "Eksik PPE",
        description: "Güvenlik yeleği takılmamış",
        location: "Hammadde Deposu",
        timestamp: Math.floor(Date.now() / 1000) - 32400, // 9 saat önce
        severity: "medium",
        status: "open",
        image_url: null,
        confidence: 0.88,
      },
      {
        id: 10,
        worker_id: "EMP005",
        worker_name: "Can Özkan",
        violation_type: "Eksik PPE",
        description: "Güvenlik bareti takılmamış",
        location: "Montaj Alanı",
        timestamp: Math.floor(Date.now() / 1000) - 36000, // 10 saat önce
        severity: "high",
        status: "resolved",
        image_url: null,
        confidence: 0.94,
      },
      {
        id: 11,
        worker_id: "EMP001",
        worker_name: "Ahmet Yılmaz",
        violation_type: "Yanlış PPE",
        description: "Hasarlı güvenlik bareti",
        location: "Ana Üretim Hattı",
        timestamp: Math.floor(Date.now() / 1000) - 39600, // 11 saat önce
        severity: "medium",
        status: "open",
        image_url: null,
        confidence: 0.82,
      },
      {
        id: 12,
        worker_id: "EMP003",
        worker_name: "Mehmet Kaya",
        violation_type: "Eksik PPE",
        description: "Solunum maskesi takılmamış",
        location: "Bakım Atölyesi",
        timestamp: Math.floor(Date.now() / 1000) - 43200, // 12 saat önce
        severity: "high",
        status: "resolved",
        image_url: null,
        confidence: 0.9,
      },
      {
        id: 13,
        worker_id: "EMP002",
        worker_name: "Fatma Demir",
        violation_type: "Eksik PPE",
        description: "İş eldiveni takılmamış",
        location: "Kalite Laboratuvarı",
        timestamp: Math.floor(Date.now() / 1000) - 46800, // 13 saat önce
        severity: "low",
        status: "open",
        image_url: null,
        confidence: 0.76,
      },
      {
        id: 14,
        worker_id: "EMP004",
        worker_name: "Ayşe Çelik",
        violation_type: "Yanlış PPE",
        description: "Hasarlı iş eldiveni",
        location: "Hammadde Deposu",
        timestamp: Math.floor(Date.now() / 1000) - 50400, // 14 saat önce
        severity: "medium",
        status: "resolved",
        image_url: null,
        confidence: 0.85,
      },
      {
        id: 15,
        worker_id: "EMP005",
        worker_name: "Can Özkan",
        violation_type: "Eksik PPE",
        description: "Güvenlik yeleği takılmamış",
        location: "Montaj Alanı",
        timestamp: Math.floor(Date.now() / 1000) - 54000, // 15 saat önce
        severity: "high",
        status: "open",
        image_url: null,
        confidence: 0.93,
      },
      // Çoklu ihlal kayıtları
      {
        id: 16,
        worker_id: "EMP006",
        worker_name: "Ali Kara",
        violation_type: "Çoklu İhlal",
        description: "Güvenlik bareti ve eldiven takılmamış",
        location: "Ana Üretim Hattı",
        timestamp: Math.floor(Date.now() / 1000) - 1800, // 30 dakika önce
        severity: "high",
        status: "open",
        image_url: null,
        confidence: 0.96,
      },
      {
        id: 17,
        worker_id: "EMP007",
        worker_name: "Zeynep Ak",
        violation_type: "Çoklu İhlal",
        description: "Güvenlik maskesi ve yelek takılmamış",
        location: "Bakım Atölyesi",
        timestamp: Math.floor(Date.now() / 1000) - 2700, // 45 dakika önce
        severity: "high",
        status: "open",
        image_url: null,
        confidence: 0.94,
      },
      {
        id: 18,
        worker_id: "EMP008",
        worker_name: "Murat Gül",
        violation_type: "Çoklu İhlal",
        description: "Baret, eldiven ve gözlük takılmamış",
        location: "Kalite Laboratuvarı",
        timestamp: Math.floor(Date.now() / 1000) - 5400, // 1.5 saat önce
        severity: "high",
        status: "resolved",
        image_url: null,
        confidence: 0.91,
      },
      {
        id: 19,
        worker_id: "EMP009",
        worker_name: "Seda Mor",
        violation_type: "Çoklu İhlal",
        description: "Güvenlik yeleği ve maske takılmamış",
        location: "Hammadde Deposu",
        timestamp: Math.floor(Date.now() / 1000) - 9000, // 2.5 saat önce
        severity: "medium",
        status: "open",
        image_url: null,
        confidence: 0.88,
      },
      {
        id: 20,
        worker_id: "EMP010",
        worker_name: "Emre Sarı",
        violation_type: "Çoklu İhlal",
        description: "Baret, eldiven, yelek ve gözlük takılmamış",
        location: "Montaj Alanı",
        timestamp: Math.floor(Date.now() / 1000) - 12600, // 3.5 saat önce
        severity: "high",
        status: "open",
        image_url: null,
        confidence: 0.97,
      }
    ];
  }

  console.log("✅ Violations gönderiliyor:", global.mockViolations.length, "adet");
  res.json(global.mockViolations);
});

// Violations stats - GÜNCELLENMİŞ
router.get("/violations/stats", (req, res) => {
  console.log("📊 Violation stats istendi");

  const now = Math.floor(Date.now() / 1000);
  const today = now - (now % 86400); // Bugünün başlangıcı

  const mockStats = {
    total: 20,
    today: 5,
    uniqueWorkers: 12,
    complianceRate: 82.5,
    byType: {
      "Eksik PPE": 10,
      "Yanlış PPE": 5,
      "Çoklu İhlal": 5,
    },
    bySeverity: {
      high: 5,
      medium: 7,
      low: 3,
    },
    byStatus: {
      open: 8,
      resolved: 7,
    },
    byLocation: {
      "Ana Üretim Hattı": 3,
      "Bakım Atölyesi": 3,
      "Kalite Laboratuvarı": 3,
      "Hammadde Deposu": 3,
      "Montaj Alanı": 3,
    },
    trend: {
      thisWeek: 15,
      lastWeek: 18,
      change: -16.7,
    },
  };

  console.log("✅ Violation stats gönderiliyor:", mockStats);
  res.json(mockStats);
});

// Violation güncelle
router.put("/violations/:id", (req, res) => {
  console.log(
    "✏️ Violation güncelleniyor, ID:",
    req.params.id,
    "Data:",
    req.body
  );

  const updatedViolation = {
    id: parseInt(req.params.id),
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  console.log("✅ Violation güncellendi");
  res.json(updatedViolation);
});

// Violation sil
router.delete("/violations/:id", (req, res) => {
  console.log("🗑️ Violation siliniyor, ID:", req.params.id);

  try {
    const violationId = parseInt(req.params.id);
    
    // Mock violations array'ini bul (gerçek uygulamada veritabanından silinecek)
    // Bu basit implementasyon için global bir array kullanıyoruz
    if (!global.mockViolations) {
      global.mockViolations = []; // İlk çalıştırmada boş array
    }
    
    // Violation'ı bul ve sil
    const initialLength = global.mockViolations.length;
    global.mockViolations = global.mockViolations.filter(v => v.id !== violationId);
    
    if (global.mockViolations.length < initialLength) {
      console.log("✅ Violation silindi, ID:", violationId);
      res.json({ 
        message: "Violation başarıyla silindi", 
        id: violationId,
        success: true 
      });
    } else {
      console.log("⚠️ Violation bulunamadı, ID:", violationId);
      res.status(404).json({ 
        error: "Violation bulunamadı", 
        id: violationId,
        success: false 
      });
    }
  } catch (error) {
    console.error("❌ Violation silme hatası:", error);
    res.status(500).json({ 
      error: "Violation silinemedi", 
      message: error.message,
      success: false 
    });
  }
});

// Violations export
router.post("/violations/export", (req, res) => {
  console.log("📊 Violations export istendi, filters:", req.body);

  try {
    // Mock violation data - gerçek uygulamada veritabanından gelecek
    const mockViolations = [
      {
        id: 1,
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        worker_id: "EMP001",
        worker_name: "Ahmet Yılmaz",
        violation_type: "no_helmet",
        confidence: 0.95,
        location: "Ana Üretim Hattı",
        department: "Üretim",
        severity: "high",
        status: "open",
        description: "Baret takılmamış",
        resolved_at: null,
        resolved_by: null
      },
      {
        id: 2,
        timestamp: Math.floor(Date.now() / 1000) - 7200,
        worker_id: "EMP002",
        worker_name: "Fatma Demir",
        violation_type: "no_gloves",
        confidence: 0.87,
        location: "Kalite Laboratuvarı",
        department: "Kalite Kontrol",
        severity: "medium",
        status: "resolved",
        description: "Eldiven takılmamış",
        resolved_at: Math.floor(Date.now() / 1000) - 3600,
        resolved_by: "Yönetici"
      },
      {
        id: 3,
        timestamp: Math.floor(Date.now() / 1000) - 10800,
        worker_id: "EMP003",
        worker_name: "Mehmet Kaya",
        violation_type: "no_vest",
        confidence: 0.92,
        location: "Bakım Atölyesi",
        department: "Bakım-Onarım",
        severity: "high",
        status: "open",
        description: "Güvenlik yeleği takılmamış",
        resolved_at: null,
        resolved_by: null
      },
      {
        id: 4,
        timestamp: Math.floor(Date.now() / 1000) - 14400,
        worker_id: "EMP004",
        worker_name: "Ayşe Özkan",
        violation_type: "no_mask",
        confidence: 0.89,
        location: "Hammadde Deposu",
        department: "Depo",
        severity: "medium",
        status: "resolved",
        description: "Solunum maskesi takılmamış",
        resolved_at: Math.floor(Date.now() / 1000) - 7200,
        resolved_by: "Güvenlik Sorumlusu"
      },
      {
        id: 5,
        timestamp: Math.floor(Date.now() / 1000) - 18000,
        worker_id: "EMP005",
        worker_name: "Ali Şahin",
        violation_type: "multiple",
        confidence: 0.94,
        location: "Montaj Alanı",
        department: "Montaj",
        severity: "high",
        status: "open",
        description: "Çoklu PPE eksikliği (Baret + Eldiven)",
        resolved_at: null,
        resolved_by: null
      }
    ];

    // Excel için veri hazırla
    const excelData = mockViolations.map(violation => {
      const violationTypeMap = {
        'no_helmet': 'Baret Yok',
        'no_mask': 'Maske Yok',
        'no_gloves': 'Eldiven Yok',
        'no_vest': 'Yelek Yok',
        'multiple': 'Çoklu İhlal'
      };

      const severityMap = {
        'high': 'Yüksek',
        'medium': 'Orta',
        'low': 'Düşük'
      };

      const statusMap = {
        'open': 'Açık',
        'resolved': 'Çözüldü',
        'pending': 'Beklemede'
      };

      return {
        'İhlal ID': violation.id,
        'Tarih': new Date(violation.timestamp * 1000).toLocaleDateString('tr-TR'),
        'Saat': new Date(violation.timestamp * 1000).toLocaleTimeString('tr-TR'),
        'Çalışan ID': violation.worker_id || '',
        'Çalışan Adı': violation.worker_name || '',
        'İhlal Türü': violationTypeMap[violation.violation_type] || violation.violation_type,
        'Açıklama': violation.description || '',
        'Güven Oranı (%)': Math.round(violation.confidence * 100),
        'Lokasyon': violation.location || '',
        'Departman': violation.department || '',
        'Önem Derecesi': severityMap[violation.severity] || violation.severity,
        'Durum': statusMap[violation.status] || violation.status,
        'Çözülme Tarihi': violation.resolved_at ? 
          new Date(violation.resolved_at * 1000).toLocaleDateString('tr-TR') : '',
        'Çözülme Saati': violation.resolved_at ? 
          new Date(violation.resolved_at * 1000).toLocaleTimeString('tr-TR') : '',
        'Çözen Kişi': violation.resolved_by || ''
      };
    });

    // Excel workbook oluştur
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Sütun genişliklerini ayarla
    const columnWidths = [
      { wch: 8 },   // İhlal ID
      { wch: 12 },  // Tarih
      { wch: 10 },  // Saat
      { wch: 12 },  // Çalışan ID
      { wch: 20 },  // Çalışan Adı
      { wch: 15 },  // İhlal Türü
      { wch: 30 },  // Açıklama
      { wch: 12 },  // Güven Oranı
      { wch: 20 },  // Lokasyon
      { wch: 15 },  // Departman
      { wch: 12 },  // Önem Derecesi
      { wch: 10 },  // Durum
      { wch: 12 },  // Çözülme Tarihi
      { wch: 10 },  // Çözülme Saati
      { wch: 20 }   // Çözen Kişi
    ];
    worksheet['!cols'] = columnWidths;

    // Worksheet'i workbook'a ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, "İhlaller");

    // Excel buffer oluştur
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Response headers ayarla
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition", 
      `attachment; filename=ihlaller_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    console.log("✅ Violations export hazırlandı:", excelData.length, "kayıt");
    res.send(excelBuffer);

  } catch (error) {
    console.error("❌ Violations export hatası:", error);
    res.status(500).json({ 
      error: "Excel dosyası oluşturulamadı", 
      message: error.message 
    });
  }
});

router.get("/settings", (req, res) => {
  console.log("⚙️ Settings istendi");

  const mockSettings = {
    // Kamera Ayarları
    camera: {
      url: "rtsp://192.168.1.100:554/stream",
      fpsLimit: 30,
      resolution: "1920x1080",
      enabled: true,
      recordingEnabled: false,
      recordingPath: "/recordings",
      streamQuality: "high",
    },

    // AI Model Ayarları
    ai: {
      modelPath: "model/best.pt",
      confidenceThreshold: 0.5, // 50%
      nmsThreshold: 0.4, // 40%
      inputSize: 640,
      batchSize: 1,
      deviceType: "cpu", // cpu, gpu, auto
      enableGPU: false,
      maxDetections: 100,
    },

    // Bildirim Ayarları
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      emailRecipients: ["admin@sirket.com", "guvenlik@sirket.com"],
      smsRecipients: ["+90555123456"],
      violationNotifications: true,
      dailyReports: true,
      weeklyReports: true,
      criticalAlerts: true,
    },

    // Sistem Ayarları
    system: {
      language: "tr",
      timezone: "Europe/Istanbul",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      autoBackup: true,
      backupInterval: "daily",
      backupRetention: 30, // gün
      logLevel: "info",
      maxLogSize: 100, // MB
      sessionTimeout: 30, // dakika
    },

    // Güvenlik Ayarları
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        expirationDays: 90,
      },
      twoFactorAuth: false,
      loginAttempts: 5,
      lockoutDuration: 15, // dakika
      sessionSecurity: "medium",
      ipWhitelist: [],
      auditLog: true,
    },

    // Performans Ayarları
    performance: {
      cacheEnabled: true,
      cacheSize: 256, // MB
      compressionEnabled: true,
      optimizeImages: true,
      lazyLoading: true,
      maxConcurrentStreams: 4,
      processingQueue: 10,
      memoryLimit: 1024, // MB
    },

    // İntegrasyon Ayarları
    integrations: {
      database: {
        host: "localhost",
        port: 5432,
        name: "ppe_system",
        ssl: false,
        poolSize: 10,
      },
      api: {
        rateLimit: 1000, // requests/hour
        timeout: 30, // seconds
        retryAttempts: 3,
        enableCors: true,
      },
      webhook: {
        enabled: false,
        url: "",
        secret: "",
        events: ["violation", "alert"],
      },
    },
  };

  console.log("✅ Settings gönderiliyor");
  res.json(mockSettings);
});

// Sistem ayarlarını güncelle
router.put("/settings", (req, res) => {
  console.log("💾 Settings güncelleniyor:", req.body);

  const updatedSettings = {
    ...req.body,
    updatedAt: new Date().toISOString(),
    updatedBy: "admin", // Normalde JWT'den gelecek
  };

  console.log("✅ Settings güncellendi");
  res.json({
    message: "Ayarlar başarıyla güncellendi",
    settings: updatedSettings,
  });
});

// Belirli kategori ayarlarını getir
router.get("/settings/:category", (req, res) => {
  console.log("⚙️ Settings kategorisi istendi:", req.params.category);

  const category = req.params.category;
  const allSettings = {
    camera: {
      url: "rtsp://192.168.1.100:554/stream",
      fpsLimit: 30,
      resolution: "1920x1080",
      enabled: true,
    },
    ai: {
      modelPath: "model/best.pt",
      confidenceThreshold: 0.5,
      nmsThreshold: 0.4,
      inputSize: 640,
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
    },
    system: {
      language: "tr",
      timezone: "Europe/Istanbul",
      dateFormat: "DD/MM/YYYY",
    },
  };

  if (allSettings[category]) {
    console.log("✅ Settings kategorisi gönderiliyor:", category);
    res.json(allSettings[category]);
  } else {
    console.log("❌ Bilinmeyen settings kategorisi:", category);
    res.status(404).json({ error: "Kategori bulunamadı" });
  }
});

// Belirli kategori ayarlarını güncelle
router.put("/settings/:category", (req, res) => {
  console.log(
    "💾 Settings kategorisi güncelleniyor:",
    req.params.category,
    req.body
  );

  const updatedCategorySettings = {
    category: req.params.category,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  console.log("✅ Settings kategorisi güncellendi");
  res.json({
    message: `${req.params.category} ayarları güncellendi`,
    settings: updatedCategorySettings,
  });
});

// Ayarları varsayılana sıfırla
router.post("/settings/reset", (req, res) => {
  console.log("🔄 Settings sıfırlanıyor, kategori:", req.body.category);

  const { category } = req.body;

  if (category) {
    console.log("✅ Settings kategorisi sıfırlandı:", category);
    res.json({ message: `${category} ayarları sıfırlandı` });
  } else {
    console.log("✅ Tüm settings sıfırlandı");
    res.json({ message: "Tüm ayarlar sıfırlandı" });
  }
});

// Ayarları dışa aktar
router.get("/settings/export", (req, res) => {
  console.log("📤 Settings export istendi");

  // Mock JSON export
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=settings.json");

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
    settings: {
      camera: { url: "rtsp://192.168.1.100:554/stream", fpsLimit: 30 },
      ai: { modelPath: "model/best.pt", confidenceThreshold: 0.5 },
    },
  };

  console.log("✅ Settings export hazırlandı");
  res.json(exportData);
});

// Ayarları içe aktar
router.post("/settings/import", (req, res) => {
  console.log("📥 Settings import başlıyor:", req.body);

  const { settings, overwrite = false } = req.body;

  console.log("✅ Settings import tamamlandı");
  res.json({
    message: "Ayarlar başarıyla içe aktarıldı",
    imported: Object.keys(settings || {}).length,
    overwrite,
  });
});

// Sistem durumu kontrolü
router.get("/settings/health", (req, res) => {
  console.log("🏥 System health check istendi");

  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "up", responseTime: 45 },
      camera: { status: "up", responseTime: 120 },
      ai: { status: "up", responseTime: 230 },
      storage: { status: "up", usage: "45%" },
    },
    system: {
      uptime: "2d 14h 32m",
      memory: { used: "512MB", total: "2GB", percentage: 25 },
      cpu: { usage: "15%", temperature: "45°C" },
      disk: { used: "45GB", total: "100GB", percentage: 45 },
    },
    version: "1.0.0",
    environment: "production",
  };

  console.log("✅ System health gönderiliyor");
  res.json(healthStatus);
});

// Ayar validasyonu
router.post("/settings/validate", (req, res) => {
  console.log("✅ Settings validation istendi:", req.body);

  const { category, settings } = req.body;
  const validationResults = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Mock validation
  if (category === "camera" && settings.fpsLimit > 60) {
    validationResults.warnings.push(
      "Yüksek FPS değeri performansı etkileyebilir"
    );
  }

  if (category === "ai" && settings.confidenceThreshold < 0.3) {
    validationResults.warnings.push(
      "Düşük güven eşiği yanlış pozitif sonuçlar verebilir"
    );
  }

  console.log("✅ Settings validation tamamlandı");
  res.json(validationResults);
});

// Ayar geçmişi
router.get("/settings/history", (req, res) => {
  console.log("📋 Settings history istendi");

  const mockHistory = [
    {
      id: 1,
      category: "camera",
      action: "update",
      field: "fpsLimit",
      oldValue: 25,
      newValue: 30,
      changedBy: "admin",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      reason: "Performans iyileştirmesi",
    },
    {
      id: 2,
      category: "ai",
      action: "update",
      field: "confidenceThreshold",
      oldValue: 0.6,
      newValue: 0.5,
      changedBy: "admin",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      reason: "Daha hassas tespit için",
    },
    {
      id: 3,
      category: "notifications",
      action: "update",
      field: "emailEnabled",
      oldValue: false,
      newValue: true,
      changedBy: "admin",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      reason: "E-posta bildirimlerini etkinleştir",
    },
  ];

  console.log("✅ Settings history gönderiliyor:", mockHistory.length, "kayıt");
  res.json(mockHistory);
});

// PPE stream başlatma
router.post('/stream/start', async (req, res) => {
    try {
        const result = await ppeService.startStream();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PPE stream durdurma
router.post('/stream/stop', async (req, res) => {
    try {
        const result = await ppeService.stopStream();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PPE frame alma
router.get('/frame', async (req, res) => {
    try {
        const frame = await ppeService.getFrame();
        res.send(frame); // Sadece base64 string gönder
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PPE tespitleri alma
router.get('/detections', async (req, res) => {
    try {
        const detections = await ppeService.getDetections();
        res.json(detections);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PPE servis sağlık kontrolü
router.get('/health', async (req, res) => {
    try {
        const isHealthy = await ppeService.checkHealth();
        res.json({ status: isHealthy ? 'healthy' : 'unhealthy' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mesaj gönderme endpoint'i
router.post('/messages/send', async (req, res) => {
    try {
        console.log('💬 Mesaj gönderiliyor:', req.body);
        
        const { workerId, workerName, workerEmail, subject, message, priority, type } = req.body;
        
        // Mesaj verisini validate et
        if (!workerId || !subject || !message) {
            return res.status(400).json({ 
                error: 'Worker ID, konu ve mesaj alanları zorunludur' 
            });
        }
        
        // Mock mesaj gönderme - gerçek implementasyonda e-posta/SMS servisi kullanılabilir
        const messageData = {
            id: Date.now(),
            workerId,
            workerName,
            workerEmail,
            subject,
            message,
            priority,
      type,
            status: 'sent',
            sentAt: new Date().toISOString(),
            readAt: null
        };
        
        // Burada gerçek mesaj gönderme işlemi yapılabilir:
        // - E-posta gönderme
        // - SMS gönderme  
        // - Push notification
        // - Veritabanına kaydetme
        
        console.log('✅ Mesaj başarıyla gönderildi:', workerName);
        
        res.status(201).json({
            success: true,
            message: 'Mesaj başarıyla gönderildi',
            data: messageData
        });
        
    } catch (error) {
        console.error('❌ Mesaj gönderme hatası:', error);
        res.status(500).json({ 
            error: 'Mesaj gönderilemedi',
            details: error.message 
        });
    }
});

// Eğitim planlama endpoint'i
router.post('/training/schedule', async (req, res) => {
    try {
        console.log('📚 Eğitim planlanıyor:', req.body);
        
        const { 
            workerId, 
            workerName, 
            title, 
            description, 
            type, 
            duration, 
            scheduledDate, 
            location, 
            instructor, 
            mandatory 
        } = req.body;
        
        // Eğitim verisini validate et
        if (!workerId || !title || !scheduledDate) {
            return res.status(400).json({ 
                error: 'Worker ID, eğitim başlığı ve tarih alanları zorunludur' 
            });
        }
        
        // Mock eğitim planlama - gerçek implementasyonda veritabanına kaydedilir
        const trainingData = {
            id: Date.now(),
            workerId,
            workerName,
            title,
            description,
            type,
            duration,
            scheduledDate,
            location,
            instructor,
            mandatory,
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
            score: null,
            feedback: null
        };
        
        // Burada gerçek eğitim planlama işlemi yapılabilir:
        // - Veritabanına kaydetme
        // - Takvim entegrasyonu
        // - Eğitmen bilgilendirme
        // - Otomatik hatırlatma ayarlama
        
        console.log('✅ Eğitim başarıyla planlandı:', workerName, '-', title);
        
        res.status(201).json({
            success: true,
            message: 'Eğitim başarıyla planlandı',
            data: trainingData
        });
        
    } catch (error) {
        console.error('❌ Eğitim planlama hatası:', error);
        res.status(500).json({ 
            error: 'Eğitim planlanamadı',
            details: error.message 
        });
    }
});

// Mesajları listeleme endpoint'i
router.get('/messages', async (req, res) => {
    try {
        console.log('📬 Mesajlar listeleniyor');
        
        const { workerId, status, limit = 50 } = req.query;
        
        // Mock mesaj listesi
        const mockMessages = [
            {
                id: 1,
                workerId: 1,
                workerName: 'Ahmet Yılmaz',
                subject: 'Güvenlik Eğitimi Hatırlatması',
                message: 'Yarın saat 14:00\'te güvenlik eğitimine katılmanız gerekmektedir.',
                priority: 'high',
                type: 'reminder',
                status: 'read',
                sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                readAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 2,
                workerId: 2,
                workerName: 'Fatma Demir',
                subject: 'PPE Eksikliği Uyarısı',
                message: 'Bugün güvenlik bareti takmamanız tespit edildi. Lütfen dikkat ediniz.',
                priority: 'medium',
                type: 'warning',
                status: 'sent',
                sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                readAt: null
            }
        ];
        
        let filteredMessages = mockMessages;
        
        if (workerId) {
            filteredMessages = filteredMessages.filter(msg => msg.workerId == workerId);
        }
        
        if (status) {
            filteredMessages = filteredMessages.filter(msg => msg.status === status);
        }
        
        filteredMessages = filteredMessages.slice(0, parseInt(limit));
        
        console.log('✅ Mesajlar gönderiliyor:', filteredMessages.length, 'adet');
        res.json(filteredMessages);
        
    } catch (error) {
        console.error('❌ Mesaj listeleme hatası:', error);
        res.status(500).json({ 
            error: 'Mesajlar listelenemedi',
            details: error.message 
        });
    }
});

// Eğitimleri listeleme endpoint'i
router.get('/training', async (req, res) => {
    try {
        console.log('📚 Eğitimler listeleniyor');
        
        const { workerId, status, type, limit = 50 } = req.query;
        
        // Mock eğitim listesi
        const mockTrainings = [
            {
                id: 1,
                workerId: 1,
                workerName: 'Ahmet Yılmaz',
                title: 'İş Güvenliği Temel Eğitimi',
                description: 'Temel iş güvenliği kuralları ve PPE kullanımı',
                type: 'safety',
                duration: 120,
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                location: 'Eğitim Salonu A',
                instructor: 'Mühendis Ali Veli',
                mandatory: true,
                status: 'scheduled',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 2,
                workerId: 2,
                workerName: 'Fatma Demir',
                title: 'Kimyasal Güvenlik Eğitimi',
                description: 'Kimyasal madde kullanımı ve güvenlik önlemleri',
                type: 'chemical',
                duration: 90,
                scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                location: 'Laboratuvar',
                instructor: 'Dr. Ayşe Kaya',
                mandatory: true,
                status: 'scheduled',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        let filteredTrainings = mockTrainings;
        
        if (workerId) {
            filteredTrainings = filteredTrainings.filter(training => training.workerId == workerId);
        }
        
        if (status) {
            filteredTrainings = filteredTrainings.filter(training => training.status === status);
        }
        
        if (type) {
            filteredTrainings = filteredTrainings.filter(training => training.type === type);
        }
        
        filteredTrainings = filteredTrainings.slice(0, parseInt(limit));
        
        console.log('✅ Eğitimler gönderiliyor:', filteredTrainings.length, 'adet');
        res.json(filteredTrainings);
        
    } catch (error) {
        console.error('❌ Eğitim listeleme hatası:', error);
        res.status(500).json({ 
            error: 'Eğitimler listelenemedi',
            details: error.message 
        });
    }
});

// Kamera bağlantısını test et
router.post("/camera/test", async (req, res) => {
  console.log("📹 Kamera bağlantısı test ediliyor...");

  try {
    // Gerçek implementasyonda burada kamera URL'sine bağlantı test edilir
    // Şimdilik mock response döndürüyoruz
    
    // Simüle edilmiş test süresi
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // %80 başarı oranı ile test sonucu simüle et
    const isSuccess = Math.random() > 0.2;
    
    if (isSuccess) {
      console.log("✅ Kamera bağlantısı başarılı");
      res.json({
        success: true,
        message: "Kamera bağlantısı başarılı",
        status: "connected",
        timestamp: new Date().toISOString()
      });
    } else {
      console.log("❌ Kamera bağlantısı başarısız");
      res.status(400).json({
        success: false,
        message: "Kamera bağlantısı başarısız",
        status: "error",
        error: "Kameraya erişim sağlanamadı",
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("❌ Kamera test hatası:", error);
    res.status(500).json({
      success: false,
      message: "Kamera test işlemi başarısız",
      status: "error",
      error: error.message
    });
  }
});

// Kamera akışını başlat
router.post("/camera/start", async (req, res) => {
  console.log("🎥 Kamera akışı başlatılıyor...");

  try {
    // Gerçek implementasyonda burada kamera akışı başlatılır
    // Şimdilik mock response döndürüyoruz
    
    console.log("✅ Kamera akışı başlatıldı");
    res.json({
      success: true,
      message: "Kamera akışı başarıyla başlatıldı",
      streamUrl: "http://localhost:5001/api/ppe/camera/stream",
      status: "streaming",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Kamera akışı başlatma hatası:", error);
    res.status(500).json({
      success: false,
      message: "Kamera akışı başlatılamadı",
      error: error.message
    });
  }
});

// Kamera akışını durdur
router.post("/camera/stop", async (req, res) => {
  console.log("⏹️ Kamera akışı durduruluyor...");

  try {
    console.log("✅ Kamera akışı durduruldu");
    res.json({
      success: true,
      message: "Kamera akışı başarıyla durduruldu",
      status: "stopped",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Kamera akışı durdurma hatası:", error);
    res.status(500).json({
      success: false,
      message: "Kamera akışı durdurulamadı",
      error: error.message
    });
  }
});

// Kamera durumunu getir
router.get("/camera/status", async (req, res) => {
  console.log("📊 Kamera durumu istendi");

  try {
    // Mock kamera durumu
    const status = {
      connected: true,
      streaming: false,
      url: "rtsp://192.168.1.100:554/stream",
      resolution: "1280x720",
      fps: 30,
      lastCheck: new Date().toISOString()
    };

    console.log("✅ Kamera durumu gönderiliyor");
    res.json(status);
  } catch (error) {
    console.error("❌ Kamera durumu hatası:", error);
    res.status(500).json({
      error: "Kamera durumu alınamadı",
      message: error.message
    });
  }
});

// Bilgisayar kamerası akışı (webcam)
router.get("/camera/webcam", async (req, res) => {
  console.log("📱 Webcam akışı istendi");

  try {
    // Bu endpoint gerçek implementasyonda bilgisayar kamerasına erişim sağlar
    // Şimdilik test için mock response döndürüyoruz
    
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Webcam Test</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 2rem;
            background: #f8f9fa;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          video {
            width: 100%;
            max-width: 640px;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .error {
            color: #dc3545;
            padding: 1rem;
            background: #f8d7da;
            border-radius: 8px;
            margin: 1rem 0;
          }
          .success {
            color: #155724;
            padding: 1rem;
            background: #d4edda;
            border-radius: 8px;
            margin: 1rem 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 Webcam Test Sayfası</h1>
          <p>Bu sayfa bilgisayar kameranızı test etmek için kullanılır.</p>
          
          <video id="video" autoplay playsinline></video>
          <div id="status"></div>
          
          <script>
            const video = document.getElementById('video');
            const status = document.getElementById('status');
            
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                video.srcObject = stream;
                status.innerHTML = '<div class="success">✅ Kamera başarıyla bağlandı!</div>';
              })
              .catch(err => {
                console.error('Kamera erişim hatası:', err);
                status.innerHTML = '<div class="error">❌ Kameraya erişim sağlanamadı: ' + err.message + '</div>';
              });
          </script>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Webcam hatası:", error);
    res.status(500).json({
      error: "Webcam erişimi başarısız",
      message: error.message
    });
  }
});

module.exports = router;
