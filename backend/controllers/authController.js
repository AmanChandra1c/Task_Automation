const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const bcrypt = require("bcryptjs");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private/Admin
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "viewer",
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "User registered",
      details: { email, role: user.role },
      status: 201,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password +failedLoginAttempts +lockUntil");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // If admin, check lockout
    if (user.role === "admin" && user.lockUntil && user.lockUntil > new Date()) {
      const msLeft = user.lockUntil.getTime() - Date.now();
      const secondsLeft = Math.ceil(msLeft / 1000);
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked due to too many failed attempts. Try again later.",
        retryAfterSeconds: secondsLeft,
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Increment failed attempts for admin and set lock if needed
      if (user.role === "admin") {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const update = { failedLoginAttempts: attempts };
        if (attempts >= 5) {
          update.lockUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
          update.failedLoginAttempts = 0; // reset after locking
        }
        await User.updateOne({ _id: user._id }, { $set: update });
      }

      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Successful login: reset counters for admin if present
    if (user.role === "admin" && (user.failedLoginAttempts > 0 || user.lockUntil)) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0, lockUntil: null } }
      );
    }

    // Create token
    const token = user.getSignedJwtToken();

    // Log activity
    await ActivityLog.create({
      userId: user._id,
      action: "User logged in",
      details: { email },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
