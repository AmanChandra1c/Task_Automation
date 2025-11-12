const ActivityLog = require("../models/ActivityLog");

// @desc    Get activity logs
// @route   GET /api/logs
// @access  Private/Admin
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    const query = {};

    if (userId) {
      query.userId = userId;
    }

    const logs = await ActivityLog.find(query)
      .populate("userId", "name email role")
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
