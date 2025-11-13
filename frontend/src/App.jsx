import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Participants from "./pages/Participants";
import EmailTemplates from "./pages/EmailTemplates";
import SendEmail from "./pages/SendEmail";
import Certificates from "./pages/Certificates";
import Events from "./pages/Events";
import Analytics from "./pages/Analytics";
import ActivityLogs from "./pages/ActivityLogs";
import Users from "./pages/Users";
import { useSocket } from "./hooks/useSocket";

function AppContent() {
  useSocket();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="participants" element={<Participants />} />
          <Route path="templates" element={<EmailTemplates />} />
          <Route
            path="send-email"
            element={
              <AdminRoute>
                <SendEmail />
              </AdminRoute>
            }
          />
          <Route path="certificates" element={<Certificates />} />
          <Route path="events" element={<Events />} />
          <Route path="analytics" element={<Analytics />} />
          <Route
            path="logs"
            element={
              <AdminRoute>
                <ActivityLogs />
              </AdminRoute>
            }
          />
          <Route
            path="users"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName="!bg-zinc-800 !text-zinc-100"
        progressClassName="!bg-orange-500"
      />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
  );
}

export default App;
