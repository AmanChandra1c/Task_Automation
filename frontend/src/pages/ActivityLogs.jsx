import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  Pagination,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  Divider,
  IconButton,
  Collapse,
  Alert,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import api from "../services/api";
import { toast } from "react-toastify";

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
    error: {
      main: "#ef4444",
    },
    info: {
      main: "#3b82f6",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
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
        head: {
          fontWeight: 600,
          backgroundColor: "#141414",
          color: "#e5e7eb",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "rgba(99, 102, 241, 0.05)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorSuccess: {
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          color: "#6ee7b7",
        },
        colorWarning: {
          backgroundColor: "rgba(245, 158, 11, 0.15)",
          color: "#fcd34d",
        },
        colorError: {
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          color: "#fca5a5",
        },
        colorInfo: {
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          color: "#93c5fd",
        },
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          "& .MuiPaginationItem-root": {
            color: "#9ca3af",
            borderColor: "#2a2a2a",
            "&:hover": {
              backgroundColor: "rgba(99, 102, 241, 0.1)",
            },
            "&.Mui-selected": {
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              color: "#a5b4fc",
              "&:hover": {
                backgroundColor: "rgba(99, 102, 241, 0.3)",
              },
            },
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

// Mobile Log Card Component
const MobileLogCard = ({ log, getStatusColor, getStatusIcon }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1.5,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {log.action}
            </Typography>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}
            >
              <PersonIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {log.userId?.name || "Unknown"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {new Date(log.timestamp).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={getStatusIcon(log.status)}
            label={log.status}
            color={getStatusColor(log.status)}
            size="small"
          />
        </Box>

        {log.details && (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Details
              </Typography>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s",
                }}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Box>
            <Collapse in={expanded}>
              <Paper
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: "#141414",
                  border: "1px solid #2a2a2a",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    color: "text.secondary",
                    fontSize: "0.7rem",
                  }}
                >
                  {JSON.stringify(log.details, null, 2)}
                </Typography>
              </Paper>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      const response = await api.get(`/logs?page=${page}&limit=50`);
      setLogs(response.data.data);
      setTotalPages(response.data.pages);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load activity logs");
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return "success";
    if (status >= 400 && status < 500) return "warning";
    if (status >= 500) return "error";
    return "info";
  };

  const getStatusIcon = (status) => {
    const iconProps = { sx: { fontSize: 16 } };
    if (status >= 200 && status < 300)
      return <CheckCircleIcon {...iconProps} />;
    if (status >= 400 && status < 500) return <WarningIcon {...iconProps} />;
    if (status >= 500) return <ErrorIcon {...iconProps} />;
    return <InfoIcon {...iconProps} />;
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
          variant={isSmallMobile ? "h5" : "h4"}
          gutterBottom
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Activity Logs
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
            View all system activity including user actions, API calls, and
            status codes.
            {!isMobile &&
              " Click on mobile cards to expand and view detailed information."}
          </Typography>
        </Alert>

        {isMobile ? (
          // Mobile Card View
          <Box>
            {logs.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  No activity logs found
                </Typography>
              </Paper>
            ) : (
              logs.map((log) => (
                <MobileLogCard
                  key={log._id}
                  log={log}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </Box>
        ) : (
          // Desktop Table View
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No activity logs found
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {log.userId?.name || "Unknown"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.userId?.email || "N/A"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {log.action}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography
                          variant="caption"
                          component="div"
                          sx={{
                            fontFamily: "monospace",
                            color: "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={
                            log.details ? JSON.stringify(log.details) : "N/A"
                          }
                        >
                          {log.details
                            ? JSON.stringify(log.details).substring(0, 100) +
                              "..."
                            : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(log.status)}
                          label={log.status}
                          color={getStatusColor(log.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box
          display="flex"
          justifyContent="center"
          mt={3}
          sx={{
            "& .MuiPagination-ul": {
              flexWrap: "wrap",
              gap: { xs: 0.5, sm: 1 },
            },
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            size={isSmallMobile ? "small" : "medium"}
            siblingCount={isSmallMobile ? 0 : 1}
            boundaryCount={isSmallMobile ? 1 : 1}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ActivityLogs;
