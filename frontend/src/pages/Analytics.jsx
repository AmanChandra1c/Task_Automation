import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ThemeProvider,
  createTheme,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Email as EmailIcon,
  CardMembership as CertificateIcon,
  Event as EventIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import api from "../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

// Dark theme configuration
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1",
    },
    secondary: {
      main: "#8b5cf6",
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
    action: {
      hover: "rgba(99, 102, 241, 0.08)",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          borderRadius: 8,
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
          },
        },
      },
    },
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
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#2a2a2a",
            },
            "&:hover fieldset": {
              borderColor: "#3a3a3a",
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2a2a2a",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#3a3a3a",
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "rgba(99, 102, 241, 0.08)",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            "&:hover": {
              backgroundColor: "rgba(99, 102, 241, 0.2)",
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardWarning: {
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          color: "#fcd34d",
          border: "1px solid rgba(245, 158, 11, 0.2)",
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

const Analytics = () => {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("excel");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [events, setEvents] = useState([]);
  const { isAdmin } = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get("/events");
      setEvents(response.data.data);
    } catch (error) {
      console.error("Failed to load events");
    }
  };

  const handleExport = async (type, eventId = null) => {
    setLoading(true);
    try {
      let url = "";
      if (type === "emails") {
        url = `/analytics/export/emails?format=${format}`;
      } else if (type === "certificates") {
        url = `/analytics/export/certificates?format=${format}`;
      } else if (type === "event" && eventId) {
        url = `/analytics/export/event/${eventId}?format=${format}`;
      } else {
        toast.error("Please select an event");
        setLoading(false);
        return;
      }

      const response = await api.get(url, {
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      if (type === "emails") {
        link.download = `emails-report.${format === "pdf" ? "pdf" : "xlsx"}`;
      } else if (type === "certificates") {
        link.download = `certificates-report.${
          format === "pdf" ? "pdf" : "xlsx"
        }`;
      } else if (type === "event") {
        link.download = `event-summary.${format === "pdf" ? "pdf" : "xlsx"}`;
      }

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Report downloaded successfully");
    } catch (error) {
      toast.error("Failed to export report");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            bgcolor: "background.default",
            minHeight: "100vh",
            p: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            variant={isMobile ? "h5" : "h4"}
            gutterBottom
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Analytics & Reports
          </Typography>
          <Paper
            sx={{
              p: { xs: 3, sm: 4, md: 6 },
              textAlign: "center",
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  borderRadius: "50%",
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LockIcon
                  sx={{ fontSize: { xs: 40, sm: 48 }, color: "#fcd34d" }}
                />
              </Box>
              <Typography
                variant={isMobile ? "h6" : "h5"}
                sx={{ fontWeight: 600 }}
              >
                Admin Access Required
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 500 }}
              >
                You need admin access to export reports. Please contact an
                administrator to gain access to analytics and reporting
                features.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          bgcolor: "background.default",
          minHeight: "100vh",
          p: { xs: 2, sm: 3 },
        }}
      >
        <Typography
          variant={isMobile ? "h5" : "h4"}
          gutterBottom
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Analytics & Reports
        </Typography>

        <Alert
          severity="info"
          sx={{
            mb: 3,
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            color: "#93c5fd",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <Typography variant="body2">
            Export comprehensive reports in Excel or PDF format for emails,
            certificates, and event summaries.
          </Typography>
        </Alert>

        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          {/* Emails Report Card */}
          <Grid item xs={12} sm={6} lg={4}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(16, 185, 129, 0.1)",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <EmailIcon sx={{ fontSize: 28, color: "#10b981" }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    }}
                  >
                    Emails Report
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3, minHeight: { sm: 40 } }}
                >
                  Export detailed email activity including sent emails, delivery
                  status, and timestamps.
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    label="Format"
                    size={isMobile ? "small" : "medium"}
                  >
                    <MenuItem value="excel">
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body1">Excel</Typography>
                        <Typography variant="caption" color="text.secondary">
                          .xlsx format
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="pdf">
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body1">PDF</Typography>
                        <Typography variant="caption" color="text.secondary">
                          .pdf format
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport("emails")}
                  disabled={loading}
                  fullWidth
                  size={isMobile ? "medium" : "large"}
                >
                  Export Report
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Certificates Report Card */}
          <Grid item xs={12} sm={6} lg={4}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(245, 158, 11, 0.1)",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <CertificateIcon sx={{ fontSize: 28, color: "#f59e0b" }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    }}
                  >
                    Certificates Report
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3, minHeight: { sm: 40 } }}
                >
                  Export certificate generation data including participant
                  details and certificate status.
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    label="Format"
                    size={isMobile ? "small" : "medium"}
                  >
                    <MenuItem value="excel">
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body1">Excel</Typography>
                        <Typography variant="caption" color="text.secondary">
                          .xlsx format
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="pdf">
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body1">PDF</Typography>
                        <Typography variant="caption" color="text.secondary">
                          .pdf format
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport("certificates")}
                  disabled={loading}
                  fullWidth
                  size={isMobile ? "medium" : "large"}
                >
                  Export Report
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Event Summary Card */}
          <Grid item xs={12} lg={4}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(99, 102, 241, 0.1)",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <EventIcon sx={{ fontSize: 28, color: "#6366f1" }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    }}
                  >
                    Event Summary
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3, minHeight: { sm: 40 } }}
                >
                  Generate comprehensive summaries for specific events with all
                  participant and activity data.
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Event</InputLabel>
                  <Select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    label="Select Event"
                    size={isMobile ? "small" : "medium"}
                  >
                    {events.map((event) => (
                      <MenuItem key={event._id} value={event._id}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            py: 0.5,
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {event.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(event.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    label="Format"
                    size={isMobile ? "small" : "medium"}
                  >
                    <MenuItem value="excel">
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body1">Excel</Typography>
                        <Typography variant="caption" color="text.secondary">
                          .xlsx format
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="pdf">
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body1">PDF</Typography>
                        <Typography variant="caption" color="text.secondary">
                          .pdf format
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport("event", selectedEvent)}
                  disabled={loading || !selectedEvent}
                  fullWidth
                  size={isMobile ? "medium" : "large"}
                >
                  Export Summary
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {loading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            mt={4}
            sx={{
              p: 3,
              bgcolor: "#1a1a1a",
              borderRadius: 2,
              border: "1px solid #2a2a2a",
            }}
          >
            <CircularProgress size={isMobile ? 32 : 40} />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Generating report...
            </Typography>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default Analytics;
