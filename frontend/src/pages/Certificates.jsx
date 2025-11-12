import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ThemeProvider,
  createTheme,
  Chip,
  Alert,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  AutoAwesome as AutoAwesomeIcon,
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
    info: {
      main: "#3b82f6",
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
    MuiIconButton: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "rgba(99, 102, 241, 0.1)",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
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
        standardInfo: {
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          color: "#93c5fd",
          border: "1px solid rgba(59, 130, 246, 0.2)",
        },
      },
    },
  },
});

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [templateType, setTemplateType] = useState("sistec");
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await api.get("/certificates");
      setCertificates(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load certificates");
      setLoading(false);
    }
  };

  const handlePreview = async (certificateId) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const response = await api.get(`/certificates/${certificateId}/preview`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewLoading(false);
    } catch (error) {
      toast.error("Failed to load certificate preview");
      setPreviewLoading(false);
      setPreviewOpen(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  };

  const handleEditTemplate = (certificate) => {
    setSelectedCertificate(certificate);
    setTemplateType(certificate.templateType || "sistec");
    setEditTemplateOpen(true);
  };

  const handleCloseEditTemplate = () => {
    setEditTemplateOpen(false);
    setSelectedCertificate(null);
    setTemplateType("sistec");
  };

  const handleUpdateTemplate = async () => {
    if (!selectedCertificate) return;

    try {
      await api.put(`/certificates/${selectedCertificate._id}/template`, {
        templateType,
      });
      toast.success("Template type updated successfully");
      fetchCertificates();
      handleCloseEditTemplate();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update template");
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

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh", p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Certificates
        </Typography>

        <Alert icon={<AutoAwesomeIcon />} severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Certificates are automatically generated and sent to participants at
            11:59 PM on the event day. Certificate templates are automatically
            created when events are created.
          </Typography>
        </Alert>

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>S.No</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Template Type</TableCell>
                <TableCell>Generated Certificates</TableCell>
                {isAdmin && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {certificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} align="center">
                    <Box sx={{ py: 4 }}>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        gutterBottom
                      >
                        No certificates found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Certificates are automatically created when events are
                        created.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                certificates.map((certificate, ind) => (
                  <TableRow key={certificate._id}>
                    <TableCell>{ind+1}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }}>
                        {certificate.eventId?.name || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          certificate.templateType === "sistec"
                            ? "SISTec Template"
                            : "Custom Template"
                        }
                        size="small"
                        sx={{
                          bgcolor:
                            certificate.templateType === "sistec"
                              ? "rgba(99, 102, 241, 0.15)"
                              : "rgba(139, 92, 246, 0.15)",
                          color:
                            certificate.templateType === "sistec"
                              ? "#a5b4fc"
                              : "#c4b5fd",
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, color: "primary.main" }}
                        >
                          {certificate.generatedCertificates?.length || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          certificates
                        </Typography>
                      </Box>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <IconButton
                            onClick={() => handlePreview(certificate._id)}
                            size="small"
                            sx={{ color: "primary.main" }}
                            title="Preview"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => handleEditTemplate(certificate)}
                            size="small"
                            sx={{ color: "secondary.main" }}
                            title="Change Template"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Preview Dialog */}
        <Dialog
          open={previewOpen}
          onClose={handleClosePreview}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxHeight: "90vh",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            Certificate Preview
          </DialogTitle>
          <DialogContent>
            {previewLoading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="400px"
              >
                <CircularProgress />
              </Box>
            ) : previewUrl ? (
              <Box
                sx={{
                  width: "100%",
                  height: "70vh",
                  display: "flex",
                  justifyContent: "center",
                  bgcolor: "#0a0a0a",
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid #2a2a2a",
                }}
              >
                <iframe
                  src={previewUrl}
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                  title="Certificate Preview"
                />
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleClosePreview}
              sx={{ color: "text.secondary" }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog
          open={editTemplateOpen}
          onClose={handleCloseEditTemplate}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            Change Certificate Template
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Template Type</InputLabel>
                <Select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  label="Template Type"
                >
                  <MenuItem value="sistec">
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        SISTec Template
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Official SISTec certificate template
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="custom">
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Custom Template
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Customizable certificate template
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  Select the template type for this certificate. The template
                  will be used when generating certificates for participants.
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseEditTemplate}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate} variant="contained">
              Update Template
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default Certificates;
