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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  createTheme,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// 🌙 Custom dark theme
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0d0d0d", // main background
      paper: "#1a1a1a", // card background
    },
    primary: {
      main: "#facc15", // yellow accent
    },
    text: {
      primary: "#f5f5f5",
      secondary: "#b3b3b3",
    },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h4: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          backgroundColor: "#1a1a1a",
          border: "1px solid #2b2b2b",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: 600,
          "&:hover": { backgroundColor: "#facc15", color: "#000" },
        },
      },
    },
  },
});

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer",
  });
  const { isAdmin } = useAuth();
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users");
      setUsers(response.data.data);
      setLoading(false);
    } catch {
      toast.error("Failed to load users");
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    setEditingUser(user);
    setFormData(
      user
        ? { name: user.name, email: user.email, password: "", role: user.role }
        : { name: "", email: "", password: "", role: "viewer" }
    );
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "viewer" });
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await api.put(`/users/${editingUser._id}`, updateData);
        toast.success("User updated successfully");
      } else {
        await api.post("/auth/register", formData);
        toast.success("User created successfully");
      }
      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save user");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await api.delete(`/users/${id}`);
        toast.success("User deleted successfully");
        fetchUsers();
      } catch {
        toast.error("Failed to delete user");
      }
    }
  };

  if (!isAdmin) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box textAlign="center" py={8}>
          <Typography variant="h4" color="primary">
            Access Denied
          </Typography>
          <Typography color="text.secondary">
            You don't have permission to access this page.
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          p: isMobile ? 2 : 4,
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          flexDirection={isMobile ? "column" : "row"}
          gap={2}
        >
          <Typography variant="h4">Users</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: "primary.main", color: "#000" }}
          >
            Create User
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#facc15" }}>Name</TableCell>
                <TableCell sx={{ color: "#facc15" }}>Email</TableCell>
                <TableCell sx={{ color: "#facc15" }}>Role</TableCell>
                <TableCell sx={{ color: "#facc15" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      sx={{
                        bgcolor:
                          user.role === "admin"
                            ? "primary.main"
                            : "rgba(255,255,255,0.1)",
                        color: user.role === "admin" ? "#000" : "#fff",
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpenDialog(user)}
                      sx={{ color: "#facc15" }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(user._id)}
                      sx={{ color: "#ef4444" }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { bgcolor: "#1a1a1a", border: "1px solid #2b2b2b" },
          }}
        >
          <DialogTitle sx={{ color: "#facc15" }}>
            {editingUser ? "Edit User" : "Create User"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              variant="filled"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              variant="filled"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              margin="normal"
              disabled={!!editingUser}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="filled"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              margin="normal"
              helperText={
                editingUser ? "Leave empty to keep current password" : ""
              }
            />
            <FormControl fullWidth margin="normal" variant="filled">
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{ bgcolor: "primary.main", color: "#000" }}
            >
              {editingUser ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default Users;
