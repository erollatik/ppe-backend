const { User, Detection, DetectionResult } = require('../models/database');
const { Op } = require('sequelize');

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı listesi alınamadı',
      error: error.message
    });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Admin kendini deaktif edemez
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı deaktif edemezsiniz'
      });
    }

    await user.update({ isActive: !user.isActive });

    res.json({
      success: true,
      message: `Kullanıcı ${user.isActive ? 'aktif' : 'deaktif'} edildi`,
      data: {
        userId: user.id,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Toggle user status hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı durumu değiştirilemedi',
      error: error.message
    });
  }
};

const getAllDetections = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', userId = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;

    const { count, rows: detections } = await Detection.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        },
        {
          model: DetectionResult
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        detections,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all detections hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Detection listesi alınamadı',
      error: error.message
    });
  }
};

const getSystemStats = async (req, res) => {
  try {
    // Kullanıcı istatistikleri
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const adminUsers = await User.count({ where: { role: 'admin' } });

    // Detection istatistikleri
    const totalDetections = await Detection.count();
    const completedDetections = await Detection.count({ where: { status: 'completed' } });
    const failedDetections = await Detection.count({ where: { status: 'failed' } });
    const pendingDetections = await Detection.count({ where: { status: 'pending' } });
    const processingDetections = await Detection.count({ where: { status: 'processing' } });

    // Violation istatistikleri
    const totalViolations = await DetectionResult.count({ where: { hasViolation: true } });

    // Son 7 günün detection sayıları
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDetections = await Detection.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          admin: adminUsers,
          inactive: totalUsers - activeUsers
        },
        detections: {
          total: totalDetections,
          completed: completedDetections,
          failed: failedDetections,
          pending: pendingDetections,
          processing: processingDetections,
          recentWeek: recentDetections
        },
        violations: {
          total: totalViolations
        }
      }
    });

  } catch (error) {
    console.error('Get system stats hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sistem istatistikleri alınamadı',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  toggleUserStatus,
  getAllDetections,
  getSystemStats
};
