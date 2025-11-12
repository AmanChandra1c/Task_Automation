import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Chip,
  ThemeProvider,
  createTheme,
  Divider,
} from "@mui/material";
import {
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import api from "../services/api";
import { toast } from "react-toastify";

// Dark theme configuration
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1" },
    secondary: { main: "#8b5cf6" },
    background: { default: "#0a0a0a", paper: "#1a1a1a" },
    text: { primary: "#e5e7eb", secondary: "#9ca3af" },
    success: { main: "#10b981" },
    action: { hover: "rgba(99, 102, 241, 0.08)" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const SendEmail = () => {
  const [templates, setTemplates] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, participantsRes] = await Promise.all([
        api.get("/templates"),
        api.get("/excel/participants"),
      ]);
      setTemplates(templatesRes.data.data);
      setParticipants(participantsRes.data.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load data");
      setLoading(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedParticipants(participants.map((p) => p._id));
    } else {
      setSelectedParticipants([]);
    }
  };

  const handleSelectParticipant = (participantId) => {
    if (selectedParticipants.includes(participantId)) {
      setSelectedParticipants(
        selectedParticipants.filter((id) => id !== participantId)
      );
    } else {
      setSelectedParticipants([...selectedParticipants, participantId]);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate) return toast.error("Please select a template");
    if (selectedParticipants.length === 0)
      return toast.error("Please select at least one participant");

    setSending(true);
    try {
      if (scheduleDate) {
        await api.post("/emails/schedule", {
          templateId: selectedTemplate,
          participantIds: selectedParticipants,
          scheduleDate: scheduleDate.toISOString(),
        });
        toast.success("Email scheduled successfully");
      } else {
        await api.post("/emails/send-bulk", {
          templateId: selectedTemplate,
          participantIds: selectedParticipants,
        });
        toast.success("Emails sent successfully");
      }
      setSelectedParticipants([]);
      setScheduleDate(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send emails");
    } finally {
      setSending(false);
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
          p: { xs: 2, sm: 3 },
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Send Email
        </Typography>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          {/* Template Selection */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Select Template
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Choose an email template</InputLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                label="Choose an email template"
              >
                {templates.map((template) => (
                  <MenuItem key={template._id} value={template._id}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {template.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.subject}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3, borderColor: "#2a2a2a" }} />

          {/* Participants Section */}
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                mb: 2,
                gap: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Participants
              </Typography>
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
                    onChange={handleSelectAll}
                  />
                }
                label="Select All"
              />
            </Box>

            <Paper
              variant="outlined"
              sx={{
                maxHeight: { xs: 300, sm: 400 },
                overflow: "auto",
                bgcolor: "#141414",
                border: "1px solid #2a2a2a",
                borderRadius: 2,
                p: 1,
              }}
            >
              <List dense>
                {participants.map((participant) => (
                  <ListItem
                    key={participant._id}
                    sx={{
                      border: "1px solid transparent",
                      "&:hover": { border: "1px solid #2a2a2a" },
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { xs: "flex-start", sm: "center" },
                      gap: { xs: 1, sm: 0 },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 500 }}>
                          {participant.name}
                        </Typography>
                      }
                      secondary={
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            alignItems: "center",
                            flexWrap: "wrap",
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {participant.email}
                          </Typography>
                          {participant.semester && (
                            <Chip
                              label={participant.semester}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                bgcolor: "rgba(139, 92, 246, 0.15)",
                                color: "#c4b5fd",
                              }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Checkbox
                        edge="end"
                        checked={selectedParticipants.includes(participant._id)}
                        onChange={() =>
                          handleSelectParticipant(participant._id)
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>

          <Divider sx={{ my: 3, borderColor: "#2a2a2a" }} />

          {/* Schedule Date */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Schedule (Optional)
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Schedule Email"
                value={scheduleDate}
                onChange={setScheduleDate}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: "Leave empty to send immediately",
                  },
                }}
              />
            </LocalizationProvider>
          </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              mt: 4,
              p: 2.5,
              bgcolor: "#141414",
              borderRadius: 2,
              border: "1px solid #2a2a2a",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                label={`${selectedParticipants.length} of ${participants.length} selected`}
                sx={{
                  bgcolor:
                    selectedParticipants.length > 0
                      ? "rgba(99, 102, 241, 0.15)"
                      : "rgba(107, 114, 128, 0.15)",
                  color:
                    selectedParticipants.length > 0 ? "#a5b4fc" : "#9ca3af",
                  fontWeight: 600,
                }}
              />
              {scheduleDate && (
                <Chip
                  label={`Scheduled for ${scheduleDate.toLocaleString()}`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(245, 158, 11, 0.15)",
                    color: "#fcd34d",
                  }}
                />
              )}
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<SendIcon />}
              onClick={handleSend}
              disabled={
                sending ||
                !selectedTemplate ||
                selectedParticipants.length === 0
              }
              sx={{
                px: { xs: 2, sm: 4 },
                py: 1.5,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {sending
                ? "Sending..."
                : scheduleDate
                ? "Schedule Email"
                : "Send Email"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default SendEmail;
