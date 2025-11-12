import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import {
  People as PeopleIcon,
  Email as EmailIcon,
  CardMembership as CertificateIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

// Dark theme configuration
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1", // Indigo
    },
    secondary: {
      main: "#8b5cf6", // Purple
    },
    background: {
      default: "#0a0a0a",
      paper: "#1a1a1a",
    },
    text: {
      primary: "#e5e7eb",
      secondary: "#9ca3af",
    },
    success: {
      main: "#10b981",
    },
    warning: {
      main: "#f59e0b",
    },
    error: {
      main: "#ef4444",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          transition: "all 0.3s ease",
          "&:hover": {
            borderColor: "#3a3a3a",
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "#2a2a2a",
        },
      },
    },
  },
});

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/dashboard/stats");
      setStats(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load dashboard statistics");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          sx={{ bgcolor: "background.default" }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  const semesterData =
    stats?.participantsBySemester?.map((item) => ({
      name: item._id || "N/A",
      value: item.count,
    })) || [];

  const eventTrendsData =
    stats?.eventTrends?.map((item) => ({
      name: `${item._id.month}/${item._id.year}`,
      events: item.count,
      participants: item.participants,
    })) || [];

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh", p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
          Dashboard
        </Typography>
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/participants")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(99, 102, 241, 0.1)",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 28, color: "#6366f1" }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ mb: 0.5, fontWeight: 700 }}>
                  {stats?.totalParticipants || 0}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: "0.875rem" }}
                >
                  Total Participants
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(16, 185, 129, 0.1)",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <EmailIcon sx={{ fontSize: 28, color: "#10b981" }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ mb: 0.5, fontWeight: 700 }}>
                  {stats?.emailsSent || 0}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: "0.875rem" }}
                >
                  Emails Sent
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(245, 158, 11, 0.1)",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CertificateIcon sx={{ fontSize: 28, color: "#f59e0b" }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ mb: 0.5, fontWeight: 700 }}>
                  {stats?.certificateSuccessRate || 0}%
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: "0.875rem" }}
                >
                  Certificate Success Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/events")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(239, 68, 68, 0.1)",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <EventIcon sx={{ fontSize: 28, color: "#ef4444" }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ mb: 0.5, fontWeight: 700 }}>
                  {stats?.totalEvents || 0}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: "0.875rem" }}
                >
                  Total Events
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 600, mb: 3 }}
              >
                Participants by Semester
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={semesterData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {semesterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 600, mb: 3 }}
              >
                Semesters Overview
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Semester</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Participants
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.participantsBySemester?.length > 0 ? (
                      stats.participantsBySemester.map((item, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            "&:hover": { bgcolor: "rgba(99, 102, 241, 0.05)" },
                          }}
                        >
                          <TableCell>{item._id || "N/A"}</TableCell>
                          <TableCell align="right">{item.count}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No semester data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 600, mb: 3 }}
              >
                Event Participation Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={eventTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke="#6366f1"
                    strokeWidth={2}
                    name="Events"
                    dot={{ fill: "#6366f1", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="participants"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Participants"
                    dot={{ fill: "#10b981", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default Dashboard;
