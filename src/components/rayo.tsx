import { ThemeToggle } from "@/components/theme";
import { label } from "@/lib/labels";
import {
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
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
  Timer,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { remainingFocusSeconds } from "@/features/reports/metrics";
import { authClient } from "@/lib/auth-client";

type ActivePage =
  "Overview" | "Projects" | "Tasks" | "Focus" | "Skills" | "Reports";

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
  const { user } = useWorkspace();
  const showLabels = !collapsed || mobile;

  const items: {
    label: ActivePage;
    icon: typeof LayoutDashboard;
    to: "/" | "/overview" | "/tasks" | "/focus" | "/skills" | "/reports";
  }[] = [
    { label: "Overview", icon: LayoutDashboard, to: "/overview" as const },
    { label: "Projects", icon: FolderKanban, to: "/" as const },
    { label: "Tasks", icon: ListChecks, to: "/tasks" as const },
    { label: "Focus", icon: Timer, to: "/focus" as const },
    { label: "Skills", icon: Blocks, to: "/skills" as const },
    { label: "Reports", icon: BarChart3, to: "/reports" as const },
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
          <Tooltip
            title={
              collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
          >
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
            {showLabels && label(item.label)}
          </Button>
        ))}
        <Button
          className="nav-button"
          startIcon={<Tag size={20} strokeWidth={2.2} />}
          onClick={onTags}
        >
          {showLabels && "Etiquetas"}
        </Button>
      </Stack>
      <Box className="sidebar-bottom">
        {showLabels && (
          <Box className="focus-panel">
            <Typography variant="overline">SEU PROGRESSO</Typography>
            <Typography variant="h6">Um passo de cada vez</Typography>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption">
              {progress}% do trabalho concluído
            </Typography>
          </Box>
        )}
        <Button className="nav-button" startIcon={<Settings size={20} />}>
          {showLabels && "Configurações"}
        </Button>
        <Button
          className="profile-button"
          startIcon={
            <Avatar className="profile-avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </Avatar>
          }
        >
          {showLabels && (
            <Box className="profile-copy">
              <Typography className="profile-name">
                {user.name || "Sua conta"}
              </Typography>
              <Typography className="profile-role">
                Responsável pelo espaço
              </Typography>
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
  const workspace = useWorkspace();
  const compact = useMediaQuery("(max-width:899px)");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    if (
      (!workspace.activeFocus || workspace.activeFocus.status === "paused") &&
      !workspace.activeBreak
    )
      return;
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [workspace.activeFocus, workspace.activeBreak]);
  const remaining = workspace.activeFocus
    ? remainingFocusSeconds(workspace.activeFocus)
    : workspace.activeBreak
      ? Math.max(
          0,
          workspace.activeBreak.plannedSeconds -
            Math.floor(
              (Date.now() -
                new Date(workspace.activeBreak.startedAt).getTime()) /
                1000,
            ),
        )
      : null;
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <>
      <Box
        className={`app-shell ${workspace.activeFocus || workspace.activeBreak ? "is-focusing" : ""}`}
      >
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
                  aria-label="Abrir navegação"
                  onClick={() => setMobileOpen(true)}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {today}
                </Typography>
                <Typography className="strong-copy">
                  Bom ter você por aqui, {workspace.user.name || "você"}
                </Typography>
              </Box>
            </Stack>
            {(workspace.activeFocus || workspace.activeBreak) && (
              <Button
                component={Link}
                to="/focus"
                className="mini-focus"
                startIcon={<Timer size={17} />}
                aria-label="Abrir sessão de foco"
              >
                {workspace.activeBreak
                  ? `Pausa ${String(Math.floor((remaining ?? 0) / 60)).padStart(2, "0")}:${String((remaining ?? 0) % 60).padStart(2, "0")}`
                  : workspace.activeFocus?.status === "paused"
                    ? "Pausado"
                    : `${String(Math.floor((remaining ?? 0) / 60)).padStart(2, "0")}:${String((remaining ?? 0) % 60).padStart(2, "0")}`}
              </Button>
            )}
            <Stack direction="row" spacing={1}>
              <ThemeToggle />
              <Tooltip title="Ajuda">
                <IconButton aria-label="Ajuda">
                  <CircleHelp size={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sair">
                <IconButton
                  aria-label="Sair"
                  onClick={() =>
                    authClient.signOut().then(() => {
                      window.location.href = "/login";
                    })
                  }
                >
                  <LogOut size={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Notificações">
                <IconButton
                  aria-label="Notificações"
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
    </>
  );
}
