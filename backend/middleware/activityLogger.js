const ActivityLog = require("../models/ActivityLog");

const activityLogger = async (req, res, next) => {
  // Log after response is sent
  const originalSend = res.json;
  res.json = function (data) {
    // Don't log if it's an auth route or if user is not authenticated
    if (req.user && !req.path.includes("/auth")) {
      ActivityLog.create({
        userId: req.user._id,
        action: `${req.method} ${req.path}`,
        details: {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
        status: res.statusCode,
        timestamp: new Date(),
      }).catch((err) => console.error("Error logging activity:", err));
    }
    return originalSend.call(this, data);
  };
  next();
};

module.exports = activityLogger;
