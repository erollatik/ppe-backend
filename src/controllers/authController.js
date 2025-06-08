const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/database');
const { Op } = require('sequelize');


const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validasyon
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Tüm alanları doldurun'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Şifreler eşleşmiyor'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalı'
      });
    }

    // Kullanıcı zaten var mı kontrol et
    const existingUser = await User.findOne({
      where: {
        $or: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email veya kullanıcı adı zaten kullanılıyor'
      });
    }

    // Şifreyi hashle
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Kullanıcı oluştur
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user'
    });

    // Token oluştur
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Register hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kayıt işlemi başarısız',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasyon
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email ve şifre gerekli'
      });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({
      where: { email: email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }

    // Kullanıcı aktif mi kontrol et
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hesabınız deaktif edilmiş'
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }

    // Token oluştur
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Login hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş işlemi başarısız',
      error: error.message
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get profile hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınamadı',
      error: error.message
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.id;

    // Başka kullanıcı aynı email/username kullanıyor mu kontrol et
    if (email || username) {
      const existingUser = await User.findOne({
        where: {
          id: { $ne: userId },
          $or: [
            email ? { email: email } : null,
            username ? { username: username } : null
          ].filter(Boolean)
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu email veya kullanıcı adı zaten kullanılıyor'
        });
      }
    }

    // Kullanıcıyı güncelle
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    await User.update(updateData, {
      where: { id: userId }
    });

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update profile hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil güncellenemedi',
      error: error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validasyon
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Tüm şifre alanları gerekli'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Yeni şifreler eşleşmiyor'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Yeni şifre en az 6 karakter olmalı'
      });
    }

    // Mevcut şifre kontrolü
    const user = await User.findByPk(req.user.id);
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre yanlış'
      });
    }

    // Yeni şifreyi hashle ve güncelle
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await User.update(
      { password: hashedNewPassword },
      { where: { id: req.user.id } }
    );

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });

  } catch (error) {
    console.error('Change password hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilemedi',
      error: error.message
    });
  }
};

const logout = async (req, res) => {
    try {
      // Token'ı geçersiz kılmak için blacklist kullanabilirsin
      // Şimdilik basit bir success response döndürelim
      res.json({
        success: true,
        message: 'Başarıyla çıkış yapıldı'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Çıkış yapılırken hata oluştu'
      });
    }
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  updateProfile,
  changePassword
};
