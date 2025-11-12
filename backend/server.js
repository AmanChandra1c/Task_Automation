const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static assets from frontend/dist
const distPath = path.join(__dirname, "../frontend/dist");

// Serve assets folder (JS, CSS files) - MUST have fallthrough: true
app.use("/assets", express.static(path.join(distPath, "assets"), {
  fallthrough: true
}));

// Serve root-level static files (images like logo.png, task-logo.webp)
app.get("/logo.png", (req, res, next) => {
  const logoPath = path.join(distPath, "logo.png");
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    next();
  }
});

app.get("/task-logo.webp", (req, res, next) => {
  const logoPath = path.join(distPath, "task-logo.webp");
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    next();
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// Set io instance for scheduler
const scheduler = require("./utils/scheduler");
scheduler.setIoInstance(io);

// Set io instance for certificate scheduler
const certificateScheduler = require("./utils/certificateScheduler");
certificateScheduler.setIoInstance(io);

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/excel", require("./routes/excel"));
app.use("/api/templates", require("./routes/templates"));
app.use("/api/emails", require("./routes/emails"));
app.use("/api/certificates", require("./routes/certificates"));
app.use("/api/events", require("./routes/events"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/logs", require("./routes/logs"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

// Serve SPA - This MUST be the absolute last route
// This catches ALL routes that don't match API, uploads, or static files
// and serves index.html so React Router can handle client-side routing
app.get("*", (req, res) => {
  console.log(`[SPA Route] Serving index.html for: ${req.path}`);
  
  // Try multiple possible paths for index.html (for different deployment environments)
  const possiblePaths = [
    path.join(__dirname, "../frontend/dist", "index.html"),
    path.join(__dirname, "../frontend/dist/index.html"),
    path.join(process.cwd(), "frontend/dist/index.html"),
    path.join(process.cwd(), "frontend/dist", "index.html"),
  ];
  
  let indexPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      indexPath = possiblePath;
      console.log(`[SPA Route] Found index.html at: ${indexPath}`);
      break;
    }
  }
  
  if (!indexPath) {
    console.error(`[SPA Route] index.html not found. Tried paths:`, possiblePaths);
    console.error(`[SPA Route] Current __dirname: ${__dirname}`);
    console.error(`[SPA Route] Current process.cwd(): ${process.cwd()}`);
    return res.status(500).send("Application not built. Please run 'npm run build' in the frontend directory.");
  }
  
  // Serve index.html for ALL SPA routes (like /logs, /templates, /participants, etc.)
  // This will be caught by React Router on the client side
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("[SPA Route] Error sending index.html:", err);
      if (!res.headersSent) {
        res.status(500).send("Error loading application");
      }
    } else {
      console.log(`[SPA Route] Successfully served index.html for: ${req.path}`);
    }
  });
});

const PORT = Number(process.env.PORT) || 5000;

// Helpful startup logs
console.log(
  `Starting server with config: PORT=${PORT}, FRONTEND_URL=${process.env.FRONTEND_URL || "not set"}`
);

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Either stop the running process on this port or set a different PORT in your environment.`
    );
  } else {
    console.error("Server startup error:", err);
  }
  process.exit(1);
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Load and reschedule pending emails
  const loadScheduledEmails = require("./utils/loadScheduledEmails");
  await loadScheduledEmails(io);

  // Start certificate scheduler (runs daily at 11:59 PM)
  try {
    certificateScheduler.startDailyScheduler();
  } catch (error) {
    console.error("Failed to start certificate scheduler:", error);
  }
});

module.exports = { app, io };
