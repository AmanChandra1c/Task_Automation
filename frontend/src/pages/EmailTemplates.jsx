import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  ThemeProvider,
  createTheme,
  Chip,
  useMediaQuery,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from "../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

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
});

// Quill dark mode styling
const quillStyles = `
  .ql-snow .ql-stroke { stroke: #9ca3af; }
  .ql-snow .ql-fill { fill: #9ca3af; }
  .ql-snow .ql-picker { color: #e5e7eb; }
  .ql-snow .ql-toolbar { border: 1px solid #2a2a2a; background-color: #141414; border-radius: 8px 8px 0 0; }
  .ql-container.ql-snow { border: 1px solid #2a2a2a; background-color: #1a1a1a; border-radius: 0 0 8px 8px; color: #e5e7eb; }
`;

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ name: "", subject: "", body: "" });
  const { isAdmin } = useAuth();
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    fetchTemplates();

    const styleEl = document.createElement("style");
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/templates");
      setTemplates(res.data.data);
      setLoading(false);
    } catch {
      toast.error("Failed to load templates");
      setLoading(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    setEditingTemplate(template);
    setFormData(template || { name: "", subject: "", body: "" });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: "", subject: "", body: "" });
  };

  const handleSubmit = async () => {
    try {
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate._id}`, formData);
        toast.success("Template updated successfully");
      } else {
        await api.post("/templates", formData);
        toast.success("Template created successfully");
      }
      handleCloseDialog();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save template");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        await api.delete(`/templates/${id}`);
        toast.success("Template deleted successfully");
        fetchTemplates();
      } catch {
        toast.error("Failed to delete template");
      }
    }
  };

  if (loading)
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

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          bgcolor: "background.default",
          minHeight: "100vh",
          p: { xs: 2, sm: 3 },
        }}
      >
        {/* Header Section */}
        <Grid
          container
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Grid item xs={12} sm="auto">
            <Typography
              variant={isMobile ? "h5" : "h4"}
              sx={{ fontWeight: 600, textAlign: { xs: "center", sm: "left" } }}
            >
              Email Templates
            </Typography>
          </Grid>
          {isAdmin && (
            <Grid
              item
              xs={12}
              sm="auto"
              sx={{
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                fullWidth={isMobile}
                sx={{
                  px: 3,
                  py: 1,
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                }}
              >
                Create Template
              </Button>
            </Grid>
          )}
        </Grid>

        {/* Table */}
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflowX: "auto",
          }}
        >
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>S.No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template, index) => (
                <TableRow key={template._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{template.name}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          onClick={() => handleOpenDialog(template)}
                          sx={{ color: "primary.main" }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(template._id)}
                          sx={{ color: "error.main" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2, p: { xs: 1, sm: 2 } },
          }}
        >
          <DialogTitle sx={{ fontWeight: 600, fontSize: { xs: "1.1rem" } }}>
            {editingTemplate ? "Edit Template" : "Create Template"}
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
            <TextField
              fullWidth
              label="Template Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              margin="normal"
            />

            <Box sx={{ mt: 1 }}>
              <ReactQuill
                theme="snow"
                value={formData.body}
                onChange={(value) => setFormData({ ...formData, body: value })}
                style={{
                  height: isMobile ? "150px" : "200px",
                  marginBottom: "50px",
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              px: { xs: 2, sm: 3 },
              pb: 2,
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 1, sm: 0 },
            }}
          >
            <Button
              onClick={handleCloseDialog}
              fullWidth={isMobile}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              fullWidth={isMobile}
            >
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default EmailTemplates;
