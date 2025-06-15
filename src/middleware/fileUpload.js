const multer = require('multer');
const path = require('path');

// Memory storage for file processing
const storage = multer.memoryStorage();

// Dosya filtresi - sadece Excel ve CSV dosyaları
const fileFilter = (req, file, cb) => {
  // İzin verilen dosya türleri
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv' // .csv (alternative)
  ];
  
  // Dosya uzantısını da kontrol et
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Desteklenmeyen dosya formatı! Sadece Excel (.xlsx, .xls) ve CSV (.csv) dosyaları kabul edilir.'), false);
  }
};

// Multer konfigürasyonu
const fileUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

module.exports = fileUpload; 