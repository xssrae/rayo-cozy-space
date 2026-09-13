import {
  CssBaseline,
  IconButton,
  ThemeProvider,
  Tooltip,
  createTheme,
} from "@mui/material";
import { ptBR } from "@mui/material/locale";
import { Moon, Sun } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function AppTheme({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("rayo-theme");
      } catch {
        /* Storage can be unavailable. */
      }
      setDark(saved === "dark" || (saved !== "light" && media.matches));
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);
  const theme = useMemo(
    () =>
      createTheme(
        {
          palette: {
            mode: dark ? "dark" : "light",
            primary: { main: dark ? "#E6A07C" : "#B75C37" },
            secondary: { main: dark ? "#AFBD99" : "#6F8062" },
            background: {
              default: dark ? "#211D1B" : "#F7F2EA",
              paper: dark ? "#2C2724" : "#FFF9F3",
            },
            text: {
              primary: dark ? "#F2E9DF" : "#362D29",
              secondary: dark ? "#BFB1A5" : "#756A63",
            },
            divider: dark ? "#494039" : "#E6DDD2",
            success: { main: dark ? "#AFBD99" : "#6F8062" },
            warning: { main: dark ? "#E3AD76" : "#C5793E" },
          },
          shape: { borderRadius: 16 },
          typography: {
            fontFamily: '"Nunito Sans", sans-serif',
            h1: { fontFamily: '"Fraunces", serif', fontWeight: 650 },
            h2: { fontFamily: '"Fraunces", serif', fontWeight: 650 },
            h3: { fontFamily: '"Fraunces", serif', fontWeight: 650 },
            button: { textTransform: "none", fontWeight: 800 },
          },
          components: {
            MuiButton: {
              styleOverrides: {
                root: {
                  borderRadius: 12,
                  boxShadow: "none",
                  paddingInline: 18,
                },
              },
            },
            MuiOutlinedInput: {
              styleOverrides: { root: { borderRadius: 14 } },
            },
            MuiDialog: {
              styleOverrides: {
                paper: { borderRadius: 20, backgroundImage: "none" },
              },
            },
            MuiChip: {
              styleOverrides: { root: { borderRadius: 9, fontWeight: 700 } },
            },
          },
        },
        ptBR,
      ),
    [dark],
  );
  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("rayo-theme", next ? "dark" : "light");
    } catch {
      /* Keep the in-memory preference. */
    }
  };
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeContext);
  const title = dark ? "Ativar tema claro" : "Ativar tema escuro";
  return (
    <Tooltip title={title}>
      <IconButton aria-label={title} onClick={toggle}>
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </IconButton>
    </Tooltip>
  );
}
