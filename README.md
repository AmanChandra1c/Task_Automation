# Advanced Task Automation & Communication System

A comprehensive MERN-based full-stack web application designed to simplify organizational communication, automate repetitive workflows, and manage participant engagement for events or academic programs.

## Features

### 1. Excel Upload & Data Extraction

- Upload .xlsx or .csv files
- Extract Name, Email, Semester, and custom fields
- Store extracted data in MongoDB
- Preview data in a clean React table

### 2. Data Visualization Dashboard

- Interactive dashboard with charts (Recharts)
- Visualize participants per semester
- Track emails sent
- Certificate delivery success rate
- Event participation trends

### 3. User Management & Authentication

- JWT-based authentication
- Role-based access control (Admin/Viewer)
- Admin: Full access
- Viewer: Read-only access

### 4. Email Template Management

- Create, save, edit, and reuse email templates
- WYSIWYG editor (react-quill)
- Placeholder support: {{name}}, {{semester}}, {{event_name}}

### 5. Scheduled Email Sending

- Schedule emails using node-cron
- Choose date & time for automatic sending
- View and manage scheduled emails

### 6. Certificate Designer

- Interactive certificate design tool
- Upload certificate template image
- Drag and place name placeholder
- Preview before sending
- Generate PDF certificates

### 7. Notification System

- Real-time notifications using Socket.IO
- Notify on file upload completion
- Email send notifications
- Certificate delivery notifications

### 8. Event Management Module

- Create and manage events
- Store event name, date, description
- Upload Excel for each event separately
- Send event-specific emails and certificates

### 9. Analytics & Reports

- Export reports in PDF or Excel format
- Sent emails report
- Certificate deliveries report
- Event summaries

### 10. Activity Logs

- Log every admin action
- Track uploaded files, emails sent, certificates generated
- Display logs in admin-only "Activity History" page

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB (Mongoose)
- Socket.IO
- JWT Authentication
- Node-cron
- Nodemailer
- PDFKit
- ExcelJS
- Multer

### Frontend

- React 18
- React Router
- Material-UI
- Recharts
- React-Quill
- Socket.IO Client
- Axios
- React-Toastify
- Vite

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

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
```

4. Start the server:

```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

## Usage

1. Start MongoDB (if using local instance)
2. Start backend server (runs on port 5000)
3. Start frontend server (runs on port 3000)
4. Open browser and navigate to `http://localhost:3000`
5. Login with admin credentials (create admin user first via API or database)

## Creating Admin User

You can create an admin user using MongoDB or by making a POST request to `/api/auth/register` (requires admin authentication, so you may need to create the first admin directly in the database).

### MongoDB Method:

```javascript
// In MongoDB shell or MongoDB Compass
use taskAutomation
db.users.insertOne({
  name: "Admin User",
  email: "admin@example.com",
  password: "$2a$10$...", // bcrypt hashed password
  role: "admin",
  createdAt: new Date()
})
```

## API Endpoints

### Authentication

- POST `/api/auth/register` - Register new user (Admin only)
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

### Participants

- POST `/api/excel/upload` - Upload Excel file
- GET `/api/excel/participants` - Get all participants
- GET `/api/excel/participants/:id` - Get single participant

### Email Templates

- POST `/api/templates` - Create template
- GET `/api/templates` - Get all templates
- GET `/api/templates/:id` - Get single template
- PUT `/api/templates/:id` - Update template
- DELETE `/api/templates/:id` - Delete template

### Emails

- POST `/api/emails/send` - Send single email
- POST `/api/emails/send-bulk` - Send bulk emails
- POST `/api/emails/schedule` - Schedule email
- GET `/api/emails/scheduled` - Get scheduled emails
- DELETE `/api/emails/scheduled/:id` - Cancel scheduled email

### Certificates

- POST `/api/certificates` - Create certificate template
- GET `/api/certificates` - Get all certificates
- GET `/api/certificates/:id` - Get single certificate
- PUT `/api/certificates/:id` - Update certificate
- POST `/api/certificates/:id/generate` - Generate single certificate
- POST `/api/certificates/:id/generate-bulk` - Generate bulk certificates

### Events

- POST `/api/events` - Create event
- GET `/api/events` - Get all events
- GET `/api/events/:id` - Get single event
- PUT `/api/events/:id` - Update event
- DELETE `/api/events/:id` - Delete event
- POST `/api/events/:id/participants` - Add participants to event

### Analytics

- GET `/api/analytics/export/emails` - Export emails report
- GET `/api/analytics/export/certificates` - Export certificates report
- GET `/api/analytics/export/event/:id` - Export event summary

### Activity Logs

- GET `/api/logs` - Get activity logs (Admin only)

### Dashboard

- GET `/api/dashboard/stats` - Get dashboard statistics

## Project Structure

```
taskAutomation/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── uploads/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## License

ISC

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

For support, email your-email@example.com or create an issue in the repository.
