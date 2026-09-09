import {
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Blocks,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Menu as MenuIcon,
  Settings,
  Sparkles,
  Tag,
} from "lucide-react";
import { useState, type ReactNode } from "react";

// Shared theme constant; it is intentionally exported for future feature components.
// eslint-disable-next-line react-refresh/only-export-components
export const rayoTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#B75C37", contrastText: "#FFF9F3" },
    secondary: { main: "#6F8062" },
    background: { default: "#F7F2EA", paper: "#FFF9F3" },
    text: { primary: "#362D29", secondary: "#756A63" },
    divider: "#E6DDD2",
    success: { main: "#6F8062" },
    warning: { main: "#C5793E" },
    info: { main: "#78909C" },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Nunito Sans", sans-serif',
    h1: { fontFamily: '"Fraunces", serif', fontWeight: 650, letterSpacing: 0 },
    h2: { fontFamily: '"Fraunces", serif', fontWeight: 650, letterSpacing: 0 },
    h3: { fontFamily: '"Fraunces", serif', fontWeight: 650, letterSpacing: 0 },
    button: { textTransform: "none", fontWeight: 800, letterSpacing: 0 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: "none", paddingInline: 18 },
      },
    },
    MuiTextField: { defaultProps: { variant: "outlined" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 14, backgroundColor: "#FFF9F3" },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20, backgroundImage: "none" } },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 9, fontWeight: 700 } } },
  },
});

type ActivePage = "Overview" | "Projects" | "Tasks" | "Skills";

function SidebarContent({
  active,
  collapsed,
  mobile,
  onCollapse,
  onCloseMobile,
  onTags,
  progress,
}: {
  active: ActivePage;
  collapsed: boolean;
  mobile?: boolean | undefined;
  onCollapse?: (() => void) | undefined;
  onCloseMobile?: (() => void) | undefined;
  onTags?: (() => void) | undefined;
  progress: number;
}) {
  const showLabels = !collapsed || mobile;

  const items: {
    label: ActivePage;
    icon: typeof LayoutDashboard;
    to: "/" | "/overview" | "/tasks" | "/skills";
  }[] = [
    { label: "Overview", icon: LayoutDashboard, to: "/overview" as const },
    { label: "Projects", icon: FolderKanban, to: "/" as const },
    { label: "Tasks", icon: ListChecks, to: "/tasks" as const },
    { label: "Skills", icon: Blocks, to: "/skills" as const },
  ];

  return (
    <Box
      className={`rayo-sidebar ${collapsed && !mobile ? "is-collapsed" : ""}`}
    >
      <Box className="brand-row">
        <Box className="brand-mark">
          <Sparkles size={20} strokeWidth={2.5} />
        </Box>
        {showLabels && (
          <Typography className="brand-name">rayo plan</Typography>
        )}
        {!mobile && (
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <IconButton className="collapse-button" onClick={onCollapse}>
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Stack component="nav" spacing={0.75} className="nav-stack">
        {items.map((item) => (
          <Button
            key={item.label}
            component={Link}
            to={item.to}
            className={`nav-button ${active === item.label ? "active" : ""}`}
            startIcon={<item.icon size={20} strokeWidth={2.2} />}
            onClick={onCloseMobile}
          >
            {showLabels && item.label}
          </Button>
        ))}
        <Button
          className="nav-button"
          startIcon={<Tag size={20} strokeWidth={2.2} />}
          onClick={onTags}
        >
          {showLabels && "Tags"}
        </Button>
      </Stack>
      <Box className="sidebar-bottom">
        {showLabels && (
          <Box className="focus-panel">
            <Typography variant="overline">THIS WEEK</Typography>
            <Typography variant="h6">A steady rhythm</Typography>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption">
              {progress}% across active work
            </Typography>
          </Box>
        )}
        <Button className="nav-button" startIcon={<Settings size={20} />}>
          {showLabels && "Settings"}
        </Button>
        <Button
          className="profile-button"
          startIcon={<Avatar className="profile-avatar">RA</Avatar>}
        >
          {showLabels && (
            <Box className="profile-copy">
              <Typography className="profile-name">Rae Anderson</Typography>
              <Typography className="profile-role">Workspace owner</Typography>
            </Box>
          )}
        </Button>
      </Box>
    </Box>
  );
}

export function RayoShell({
  active,
  onTags,
  progress,
  children,
}: {
  active: ActivePage;
  onTags?: (() => void) | undefined;
  progress: number;
  children: ReactNode;
}) {
  const compact = useMediaQuery(rayoTheme.breakpoints.down("md"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ThemeProvider theme={rayoTheme}>
      <Box className="app-shell">
        {!compact && (
          <SidebarContent
            active={active}
            collapsed={collapsed}
            onCollapse={() => setCollapsed(!collapsed)}
            onTags={onTags}
            progress={progress}
          />
        )}
        {compact && (
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            slotProps={{ paper: { className: "mobile-drawer" } }}
          >
            <SidebarContent
              active={active}
              collapsed={false}
              mobile
              onCloseMobile={() => setMobileOpen(false)}
              onTags={onTags}
              progress={progress}
            />
          </Drawer>
        )}
        <Box component="main" className="main-area">
          <Box component="header" className="topbar">
            <Stack direction="row" spacing={1.25} className="topbar-greeting">
              {compact && (
                <IconButton
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Monday, September 7
                </Typography>
                <Typography className="strong-copy">
                  Good evening, Rae
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Help">
                <IconButton aria-label="Help">
                  <CircleHelp size={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Notifications">
                <IconButton
                  aria-label="Notifications"
                  className="notification-button"
                >
                  <Bell size={20} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
