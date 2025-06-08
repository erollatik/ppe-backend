const bcrypt = require('bcryptjs');
const { User } = require('../models/database');

const createDefaultAdmin = async () => {
  try {
    // Admin var mı kontrol et
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin kullanıcı zaten mevcut');
      return;
    }

    // Default admin oluştur
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await User.create({
      username: 'admin',
      email: 'admin@ppedetection.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Default admin kullanıcı oluşturuldu');
    console.log('📧 Email: admin@ppedetection.com');
    console.log('🔑 Şifre: admin123');

  } catch (error) {
    console.error('❌ Admin oluşturma hatası:', error);
  }
};

module.exports = { createDefaultAdmin };
