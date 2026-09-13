import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/theme";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search["redirect"] === "string" ? search["redirect"] : "/overview",
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (result.error)
      setMessage("Não foi possível entrar. Confira seu e-mail e senha.");
    else await navigate({ href: redirect });
  };
  return (
    <>
      <Box className="auth-page">
        <Box className="auth-theme-toggle">
          <ThemeToggle />
        </Box>
        <Paper className="auth-card" component="main">
          <Box className="auth-brand">
            <Sparkles size={20} />
            <Typography variant="h5">rayo plan</Typography>
          </Box>
          <Typography variant="h1">Boas-vindas de volta</Typography>
          <Typography color="text.secondary">
            Seu espaço está esperando por você.
          </Typography>
          <Stack component="form" spacing={2} onSubmit={submit} sx={{ mt: 3 }}>
            {message && <Alert severity="error">{message}</Alert>}
            <TextField
              label="E-mail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </Button>
            <Button component={Link} to="/forgot-password" size="small">
              Esqueceu sua senha?
            </Button>
          </Stack>
          <Typography sx={{ mt: 3 }} color="text.secondary">
            Primeira vez por aqui? <Link to="/signup">Criar uma conta</Link>
          </Typography>
        </Paper>
      </Box>
    </>
  );
}
