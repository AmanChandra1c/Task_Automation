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
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  ThemeProvider,
  createTheme,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import api from "../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

// 🌙 Dark theme
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1" },
    secondary: { main: "#8b5cf6" },
    background: { default: "#0a0a0a", paper: "#1a1a1a" },
    text: { primary: "#e5e7eb", secondary: "#9ca3af" },
    success: { main: "#10b981" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", border: "1px solid #2a2a2a" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#2a2a2a" },
        head: { backgroundColor: "#141414", color: "#e5e7eb", fontWeight: 600 },
      },
    },
  },
});

const Participants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [eventId, setEventId] = useState("");
  const { isAdmin } = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // ✅ Mobile check
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md")); // ✅ Tablet check

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const response = await api.get("/excel/participants");
      setParticipants(response.data.data);
      setLoading(false);
    } catch {
      toast.error("Failed to load participants");
      setLoading(false);
    }
  };

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) setSelectedFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return toast.error("Please select a file");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (eventId) formData.append("eventId", eventId);

    try {
      const response = await api.post("/excel/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(response.data.message);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setEventId("");
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
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
      <Box
        sx={{
          bgcolor: "background.default",
          minHeight: "100vh",
          p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
        }}
      >
        {/* Header Section */}
        <Box
          display="flex"
          justifyContent={isMobile ? "center" : "space-between"}
          flexDirection={isMobile ? "column" : "row"}
          alignItems={isMobile ? "flex-start" : "center"}
          mb={3}
          gap={isMobile ? 2 : 0}
        >
          <Typography
            variant={isMobile ? "h5" : "h4"}
            sx={{ fontWeight: 600, textAlign: isMobile ? "center" : "left" }}
          >
            Participants
          </Typography>

          <Box
            display="flex"
            flexDirection={isMobile ? "column" : "row"}
            gap={2}
          >
            {isAdmin && (
              <Button
                fullWidth={isMobile}
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Excel
              </Button>
            )}
            <Button
              fullWidth={isMobile}
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchParticipants}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Table Section */}
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflowX: "auto",
            maxHeight: isMobile ? 500 : "none",
          }}
        >
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>S. No.</TableCell>
                <TableCell>Name</TableCell>
                {!isMobile && <TableCell>Email</TableCell>}
                {!isMobile && <TableCell>Semester</TableCell>}
                <TableCell>Event</TableCell>
                <TableCell>Email Sent</TableCell>
                <TableCell>Certificate Sent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {participants.map((participant, index) => (
                <TableRow key={participant._id}>
                  <TableCell>{index + 1}</TableCell> {/* 👈 Added */}
                  <TableCell>{participant.name}</TableCell>
                  {!isMobile && (
                    <TableCell sx={{ color: "text.secondary" }}>
                      {participant.email}
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell>{participant.semester || "N/A"}</TableCell>
                  )}
                  <TableCell>{participant.eventId?.name || "N/A"}</TableCell>
                  <TableCell>
                    <Chip
                      label={participant.emailSent ? "Yes" : "No"}
                      size="small"
                      sx={{
                        bgcolor: participant.emailSent
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(156, 163, 175, 0.15)",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={participant.certificateSent ? "Yes" : "No"}
                      size="small"
                      sx={{
                        bgcolor: participant.certificateSent
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(156, 163, 175, 0.15)",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Upload Dialog */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>Upload Excel File</DialogTitle>
          <DialogContent>
            <Box
              {...getRootProps()}
              sx={{
                border: "2px dashed #2a2a2a",
                borderRadius: 2,
                p: 3,
                mt: 1,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: isDragActive ? "action.hover" : "background.paper",
                "&:hover": { borderColor: "#3a3a3a", bgcolor: "action.hover" },
              }}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <Box>
                  <UploadIcon
                    sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
                  />
                  <Typography sx={{ fontWeight: 500 }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Click to change file
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <UploadIcon
                    sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
                  />
                  <Typography>
                    {isDragActive
                      ? "Drop the file here"
                      : "Drag & drop an Excel file here, or click to select"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Supports .xlsx and .csv files
                  </Typography>
                </Box>
              )}
            </Box>

            <TextField
              fullWidth
              label="Event ID (Optional)"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              sx={{ mt: 3 }}
            />
          </DialogContent>
          <DialogActions
            sx={{ px: 3, pb: 2, flexDirection: isMobile ? "column" : "row" }}
          >
            <Button
              fullWidth={isMobile}
              onClick={() => setUploadDialogOpen(false)}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button
              fullWidth={isMobile}
              onClick={handleUpload}
              variant="contained"
              disabled={!selectedFile || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default Participants;
