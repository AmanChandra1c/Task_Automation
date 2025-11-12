import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Box,
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const navItems = [
  { text: "Dashboard", path: "/", adminOnly: false },
  { text: "Participants", path: "/participants", adminOnly: false },
  { text: "Templates", path: "/templates", adminOnly: false },
  { text: "Send Email", path: "/send-email", adminOnly: true },
  { text: "Certificates", path: "/certificates", adminOnly: false },
  { text: "Events", path: "/events", adminOnly: false },
  { text: "Analytics", path: "/analytics", adminOnly: false },
  { text: "Logs", path: "/logs", adminOnly: true },
  { text: "Users", path: "/users", adminOnly: true },
];

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filtered = navItems.filter((i) => !i.adminOnly || isAdmin);

  const drawer = (
    <Box
      sx={{
        width: 250,
        p: 2,
        bgcolor: "#0a0a0a",
        height: "100%",
        color: "#e4e4e7",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6" sx={{ color: "#e4e4e7", fontWeight: 600 }}>
          Task Automation
        </Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ color: "#a1a1aa" }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ bgcolor: "#27272a", mb: 2 }} />
      <List sx={{ p: 0 }}>
        {filtered.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 1,
                color: location.pathname === item.path ? "#e4e4e7" : "#a1a1aa",
                bgcolor:
                  location.pathname === item.path ? "#27272a" : "transparent",
                "&:hover": {
                  bgcolor: "#1a1a1a",
                  color: "#e4e4e7",
                },
                "&.Mui-selected": {
                  bgcolor: "#27272a",
                  "&:hover": {
                    bgcolor: "#3f3f46",
                  },
                },
              }}
            >
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: location.pathname === item.path ? 500 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ bgcolor: "#27272a", mt: 2, mb: 2 }} />
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ mb: 1.5, color: "#a1a1aa" }}>
          {user?.name || "User"}
        </Typography>
        <Button
          variant="outlined"
          fullWidth
          onClick={handleLogout}
          sx={{
            color: "#e4e4e7",
            borderColor: "#3f3f46",
            textTransform: "none",
            "&:hover": {
              bgcolor: "#1a1a1a",
              borderColor: "#52525b",
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a" }}>
      {/* ====== Top AppBar ====== */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "#141414",
          borderBottom: "1px solid #27272a",
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Left Section - Logo + Menu Icon */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                display: { sm: "none" },
                color: "#a1a1aa",
                "&:hover": { color: "#e4e4e7" },
              }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#e4e4e7",
                display: { xs: "block" },
              }}
            >
              Task Automation
            </Typography>

            {/* Desktop Nav */}
            <Box
              component="nav"
              sx={{
                display: { xs: "none", sm: "flex" },
                gap: 0.5,
              }}
            >
              {filtered.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  size="small"
                  sx={{
                    color:
                      location.pathname === item.path ? "#e4e4e7" : "#a1a1aa",
                    textTransform: "none",
                    fontSize: "0.875rem",
                    fontWeight: location.pathname === item.path ? 500 : 400,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    bgcolor:
                      location.pathname === item.path
                        ? "#27272a"
                        : "transparent",
                    "&:hover": {
                      bgcolor: "#1a1a1a",
                      color: "#e4e4e7",
                    },
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Right Section - User Info + Logout */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body2"
              sx={{
                display: { xs: "none", sm: "block" },
                color: "#a1a1aa",
              }}
            >
              {user?.name || "User"}
            </Typography>
            <Button
              onClick={handleLogout}
              size="small"
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                color: "#e4e4e7",
                textTransform: "none",
                borderRadius: 1,
                px: 2,
                "&:hover": {
                  bgcolor: "#1a1a1a",
                },
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ====== Mobile Drawer ====== */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            bgcolor: "#0a0a0a",
            borderRight: "1px solid #27272a",
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* ====== Main Content ====== */}
      <Container
        sx={{
          mt: 3,
          mb: 4,
          px: { xs: 2, sm: 3, md: 4 },
          maxWidth: "xl",
        }}
      >
        <Outlet />
      </Container>
    </Box>
  );
};

export default Layout;
