# Setup Guide

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskAutomation
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

Start MongoDB (if using local instance):

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
# or
mongod
```

Create admin user:

```bash
npm run create-admin
```

Start the backend server:

```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## Default Admin Credentials

After running `npm run create-admin` in the backend:

- Email: admin@example.com (or whatever you set in ADMIN_EMAIL)
- Password: admin123 (or whatever you set in ADMIN_PASSWORD)

## Features Completed

✅ Excel Upload & Data Extraction
✅ Data Visualization Dashboard
✅ User Management & Authentication (JWT)
✅ Email Template Management (WYSIWYG)
✅ Scheduled Email Sending (node-cron)
✅ Certificate Designer (drag-and-drop)
✅ Socket.IO Notification System
✅ Event Management Module
✅ Analytics & Reports (PDF/Excel export)
✅ Activity Logs System
✅ Toast notifications on all responses

## Project Structure

```
taskAutomation/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── excelController.js
│   │   ├── templateController.js
│   │   ├── emailController.js
│   │   ├── certificateController.js
│   │   ├── eventController.js
│   │   ├── dashboardController.js
│   │   ├── analyticsController.js
│   │   └── logController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Participant.js
│   │   ├── EmailTemplate.js
│   │   ├── ScheduledEmail.js
│   │   ├── Certificate.js
│   │   ├── Event.js
│   │   └── ActivityLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── excel.js
│   │   ├── templates.js
│   │   ├── emails.js
│   │   ├── certificates.js
│   │   ├── events.js
│   │   ├── dashboard.js
│   │   ├── analytics.js
│   │   └── logs.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── activityLogger.js
│   ├── utils/
│   │   ├── excelParser.js
│   │   ├── emailService.js
│   │   ├── certificateGenerator.js
│   │   └── scheduler.js
│   ├── scripts/
│   │   └── createAdmin.js
│   ├── uploads/
│   │   ├── excel/
│   │   ├── certificate-templates/
│   │   └── certificates/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Participants.jsx
│   │   │   ├── EmailTemplates.jsx
│   │   │   ├── SendEmail.jsx
│   │   │   ├── Certificates.jsx
│   │   │   ├── Events.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── ActivityLogs.jsx
│   │   │   └── Users.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useSocket.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
└── README.md
```

## Important Notes

1. **Email Configuration**: Update the email settings in `.env` file to enable email sending functionality. For Gmail, you'll need to use an App Password.

2. **MongoDB**: Make sure MongoDB is running before starting the backend server.

3. **File Uploads**: The `uploads` directory will be created automatically when you upload files.

4. **Certificates**: Certificate templates should be image files (PNG, JPG, etc.) or PDFs.

5. **Excel Format**: Excel files should have columns: Name, Email, Semester (and any custom fields).

## Troubleshooting

### MongoDB Connection Error

- Make sure MongoDB is running
- Check the MONGODB_URI in .env file
- Verify MongoDB is accessible on the specified port

### Email Sending Fails

- Verify email credentials in .env
- For Gmail, use App Password instead of regular password
- Check if 2FA is enabled (you'll need App Password)

### Socket.IO Connection Issues

- Make sure backend is running on port 5000
- Check CORS settings in server.js
- Verify FRONTEND_URL in .env

### Certificate Generation Issues

- Make sure certificate template image is uploaded
- Verify the name placeholder position is set correctly
- Check if PDFKit is installed properly

## Next Steps

1. Customize email templates
2. Upload certificate templates
3. Create events
4. Upload participant data via Excel
5. Send emails and generate certificates
