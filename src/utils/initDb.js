const { sequelize } = require('../models/database');

async function initializeDatabase() {
  try {
    // Veritabanı bağlantısını test et
    await sequelize.authenticate();
    console.log('✅ Veritabanı bağlantısı başarılı');

    // Tabloları oluştur
    await sequelize.sync({ force: false }); // force: true tüm tabloları siler ve yeniden oluşturur
    console.log('✅ Veritabanı tabloları oluşturuldu');

  } catch (error) {
    console.error('❌ Veritabanı hatası:', error);
    process.exit(1);
  }
}

module.exports = { initializeDatabase };
