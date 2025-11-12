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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  ThemeProvider,
  createTheme,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Event as EventIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
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
    error: {
      main: "#ef4444",
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
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "#6b7280",
          "&.Mui-checked": {
            color: "#6366f1",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          color: "#a5b4fc",
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
          "&:hover": {
            backgroundColor: "rgba(99, 102, 241, 0.05)",
          },
        },
      },
    },
  },
});

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: new Date(),
  });
  const [participants, setParticipants] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get("/events");
      setEvents(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load events");
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await api.get("/excel/participants");
      setParticipants(response.data.data);
    } catch (error) {
      toast.error("Failed to load participants");
    }
  };

  const handleOpenDialog = (event = null) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        name: event.name,
        description: event.description || "",
        date: new Date(event.date),
      });
    } else {
      setSelectedEvent(null);
      setFormData({
        name: "",
        description: "",
        date: new Date(),
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEvent(null);
    setFormData({
      name: "",
      description: "",
      date: new Date(),
    });
  };

  const handleSubmit = async () => {
    try {
      if (selectedEvent) {
        await api.put(`/events/${selectedEvent._id}`, formData);
        toast.success("Event updated successfully");
      } else {
        await api.post("/events", formData);
        toast.success("Event created successfully");
      }
      handleCloseDialog();
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save event");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await api.delete(`/events/${id}`);
        toast.success("Event deleted successfully");
        fetchEvents();
      } catch (error) {
        toast.error("Failed to delete event");
      }
    }
  };

  const handleView = async (event) => {
    setSelectedEvent(event);
    await fetchParticipants();
    setViewDialogOpen(true);
  };

  const handleAddParticipants = async () => {
    if (selectedParticipants.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    try {
      await api.post(`/events/${selectedEvent._id}/participants`, {
        participantIds: selectedParticipants,
      });
      toast.success("Participants added to event successfully");
      setViewDialogOpen(false);
      setSelectedParticipants([]);
      fetchEvents();
    } catch (error) {
      toast.error("Failed to add participants");
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
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Events
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create Event
            </Button>
          )}
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>S.No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Participants</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event, ind) => (
                <TableRow key={event._id}>
                  <TableCell>{ind+1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <EventIcon sx={{ color: "primary.main", fontSize: 20 }} />
                      <Typography sx={{ fontWeight: 500 }}>
                        {event.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {new Date(event.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<PeopleIcon sx={{ fontSize: 16 }} />}
                      label={
                        event.participantCount ||
                        event.participants?.length ||
                        0
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton
                        onClick={() => handleView(event)}
                        size="small"
                        sx={{ color: "primary.main" }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      {isAdmin && (
                        <>
                          <IconButton
                            onClick={() => handleOpenDialog(event)}
                            size="small"
                            sx={{ color: "secondary.main" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(event._id)}
                            size="small"
                            sx={{ color: "error.main" }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create/Edit Event Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            {selectedEvent ? "Edit Event" : "Create Event"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Event Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              margin="normal"
              multiline
              rows={3}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Event Date"
                value={formData.date}
                onChange={(newValue) =>
                  setFormData({ ...formData, date: newValue })
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "normal",
                  },
                }}
              />
            </LocalizationProvider>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseDialog}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {selectedEvent ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Event Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            {selectedEvent?.name}
          </DialogTitle>
          <DialogContent>
            {/* Event Details */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: "#141414",
                borderRadius: 2,
                border: "1px solid #2a2a2a",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
              >
                <EventIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  Event Date
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 2, ml: 4 }}>
                {selectedEvent &&
                  new Date(selectedEvent.date).toLocaleString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" sx={{ ml: 0 }}>
                {selectedEvent?.description || "No description provided"}
              </Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: "#2a2a2a" }} />

            {/* Participants Section */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Participants
                </Typography>
                <Chip
                  icon={<PeopleIcon sx={{ fontSize: 16 }} />}
                  label={`${
                    selectedEvent?.participantCount ||
                    selectedEvent?.participants?.length ||
                    0
                  } total`}
                  sx={{
                    bgcolor: "rgba(99, 102, 241, 0.15)",
                    color: "#a5b4fc",
                    fontWeight: 600,
                  }}
                />
              </Box>

              {isAdmin && (
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={
                          selectedParticipants.length === participants.length &&
                          participants.length > 0
                        }
                        indeterminate={
                          selectedParticipants.length > 0 &&
                          selectedParticipants.length < participants.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants(
                              participants.map((p) => p._id)
                            );
                          } else {
                            setSelectedParticipants([]);
                          }
                        }}
                      />
                    }
                    label="Select All Participants"
                  />

                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: 300,
                      overflow: "auto",
                      bgcolor: "#141414",
                      border: "1px solid #2a2a2a",
                      borderRadius: 2,
                      p: 1,
                    }}
                  >
                    <List>
                      {participants.map((participant) => (
                        <ListItem
                          key={participant._id}
                          sx={{
                            border: "1px solid transparent",
                            "&:hover": {
                              border: "1px solid #2a2a2a",
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 500 }}>
                                {participant.name}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {participant.email}
                              </Typography>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Checkbox
                              edge="end"
                              checked={selectedParticipants.includes(
                                participant._id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipants([
                                    ...selectedParticipants,
                                    participant._id,
                                  ]);
                                } else {
                                  setSelectedParticipants(
                                    selectedParticipants.filter(
                                      (id) => id !== participant._id
                                    )
                                  );
                                }
                              }}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {/* Current Participants */}
              {selectedEvent?.participants &&
                selectedEvent.participants.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Current Participants
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mt: 1,
                      }}
                    >
                      {selectedEvent.participants.map((participant) => (
                        <Chip
                          key={participant._id || participant}
                          label={
                            typeof participant === "object"
                              ? participant.name
                              : "Participant"
                          }
                          size="small"
                          sx={{
                            bgcolor: "rgba(139, 92, 246, 0.15)",
                            color: "#c4b5fd",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setViewDialogOpen(false)}
              sx={{ color: "text.secondary" }}
            >
              Close
            </Button>
            {isAdmin && (
              <Button
                onClick={handleAddParticipants}
                variant="contained"
                disabled={selectedParticipants.length === 0}
              >
                Add{" "}
                {selectedParticipants.length > 0
                  ? `${selectedParticipants.length} `
                  : ""}
                Participants
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default Events;
