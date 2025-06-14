const express = require("express");
const ppeController = require("../controllers/ppeController");
const router = express.Router();
const ppeService = require('../services/ppeService');
const { Worker } = require('../models/database');

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
router.get("/workers/statistics", (req, res) => {
  console.log("📊 Worker statistics istendi");

  const mockStats = {
    totalWorkers: 45,
    activeWorkers: 42,
    averageCompliance: 87.5,
    totalViolations: 8,
    newWorkersThisMonth: 5,
    complianceChange: 2.3,
    violationChange: -3,
    departmentStats: [
      { department: "Üretim", workers: 18, compliance: 85.2 },
      { department: "Kalite Kontrol", workers: 8, compliance: 95.1 },
      { department: "Bakım-Onarım", workers: 12, compliance: 82.7 },
      { department: "Depo", workers: 7, compliance: 91.4 },
    ],
    locationStats: [
      { location: "Ana Üretim Hattı", workers: 15, compliance: 83.5 },
      { location: "Montaj Alanı", workers: 10, compliance: 88.9 },
      { location: "Kalite Laboratuvarı", workers: 6, compliance: 96.2 },
      { location: "Depo Alanları", workers: 14, compliance: 90.1 },
    ],
  };

  console.log("✅ Worker statistics gönderiliyor");
  res.json(mockStats);
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
router.post("/workers/assign-ppe", (req, res) => {
  console.log("🦺 PPE atanıyor:", req.body);

  const { workerId, ppeTypes, assignmentDate, notes } = req.body;

  console.log("✅ PPE atandı:", ppeTypes.length, "adet");
  res.json({
    message: "PPE başarıyla atandı",
    workerId,
    assignedPPE: ppeTypes,
    assignmentDate,
  });
});

// Çalışan dışa aktarma
router.post("/workers/export", (req, res) => {
  console.log("📊 Workers export istendi, filters:", req.body.filters);

  // Mock Excel response
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=workers.xlsx");

  console.log("✅ Workers export hazırlandı");
  res.send(Buffer.from("Mock Excel content"));
});

// İçe aktarma şablonu
router.get("/workers/import/template", (req, res) => {
  console.log("📋 Import template istendi");

  // Mock Excel template
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=workers-template.xlsx"
  );

  console.log("✅ Import template hazırlandı");
  res.send(Buffer.from("Mock Excel template"));
});

// İçe aktarma önizleme
router.post("/workers/import/preview", (req, res) => {
  console.log("🔍 Import preview istendi");

  // Mock import preview data
  const mockPreviewData = [
    {
      name: "Test Çalışan 1",
      workerId: "EMP999",
      department: "Üretim",
      position: "Operatör",
      errors: [],
    },
    {
      name: "Test Çalışan 2",
      workerId: "EMP998",
      department: "Bilinmeyen",
      position: "Teknisyen",
      errors: ["Geçersiz departman"],
    },
  ];

  console.log("✅ Import preview hazırlandı");
  res.json(mockPreviewData);
});

// İçe aktarma
router.post("/workers/import", (req, res) => {
  console.log("📥 Workers import başlıyor:", req.body.workers?.length, "kayıt");

  console.log("✅ Workers import tamamlandı");
  res.json({
    message: "İçe aktarma tamamlandı",
    imported: req.body.workers?.length || 0,
    failed: 0,
  });
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
    const workers = await Worker.findAll({
      order: [['createdAt', 'DESC']]
    });

    console.log("✅ Workers veritabanından gönderiliyor:", workers.length, "adet");
    return res.json(workers);
  } catch (error) {
    console.error("❌ Workers listesi hatası:", error);
    // Hata durumunda boş array döndür
    console.log("⚠️ Boş array döndürülüyor");
    return res.json([]);
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
router.delete("/workers/:workerId/ppe/:ppeType", (req, res) => {
  console.log("🗑️ PPE kaldırılıyor:", req.params);

  console.log("✅ PPE kaldırıldı");
  res.json({
    message: "PPE kaldırıldı",
    workerId: req.params.workerId,
    ppeType: req.params.ppeType,
  });
});

// Çalışan raporu oluştur
router.post("/workers/:id/report", (req, res) => {
  console.log("📄 Worker raporu oluşturuluyor, ID:", req.params.id);

  // Mock PDF response
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=worker-report.pdf"
  );

  console.log("✅ Worker raporu oluşturuldu");
  res.send(Buffer.from("Mock PDF content"));
});

// ================================
// VIOLATIONS ENDPOINTS (Mevcut)
// ================================

// Violations stats (önceki koddan)
router.get("/violations", (req, res) => {
  console.log("⚠️ Violations listesi istendi");

  const mockViolations = [
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
      description: "Uygun olmayan ayakkabı",
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
      description: "Eski model güvenlik gözlüğü",
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
      description: "Güvenlik kulaklığı takılmamış",
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
      description: "Güvenlik gözlüğü takılmamış",
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
      description: "Güvenlik ayakkabısı takılmamış",
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
      description: "Uygun olmayan iş eldiveni",
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
  ];

  console.log("✅ Violations gönderiliyor:", mockViolations.length, "adet");

  // ÖNEMLİ: Frontend violations array'i bekliyor, obje değil!
  res.json(mockViolations);
});

// Violations stats - GÜNCELLENMİŞ
router.get("/violations/stats", (req, res) => {
  console.log("📊 Violation stats istendi");

  const now = Math.floor(Date.now() / 1000);
  const today = now - (now % 86400); // Bugünün başlangıcı

  const mockStats = {
    total: 15,
    today: 3,
    uniqueWorkers: 8,
    complianceRate: 87.5,
    byType: {
      "Eksik PPE": 10,
      "Yanlış PPE": 5,
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

  console.log("✅ Violation silindi");
  res.json({ message: "Violation silindi", id: req.params.id });
});

// Violations export
router.post("/violations/export", (req, res) => {
  console.log("📊 Violations export istendi, filters:", req.body);

  // Mock Excel response
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=violations.xlsx");

  console.log("✅ Violations export hazırlandı");
  res.send(Buffer.from("Mock Excel content"));
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

module.exports = router;
