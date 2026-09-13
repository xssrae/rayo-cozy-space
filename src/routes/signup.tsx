import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/theme";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signup")({ component: SignupPage });
function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/overview",
    });
    setBusy(false);
    if (result.error)
      setMessage(
        "Não foi possível criar sua conta. Confira os dados e tente novamente.",
      );
    else setSuccess(true);
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
          <Typography variant="h1">Crie seu espaço</Typography>
          <Typography color="text.secondary">
            Um espaço tranquilo para avançar no seu ritmo.
          </Typography>
          {success ? (
            <Alert severity="success" sx={{ mt: 3 }}>
              Confirme sua conta pelo e-mail recebido e depois{" "}
              <a href="/login">entre</a>.
            </Alert>
          ) : (
            <Stack
              component="form"
              spacing={2}
              onSubmit={submit}
              sx={{ mt: 3 }}
            >
              {message && <Alert severity="error">{message}</Alert>}
              <TextField
                label="Nome"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
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
                autoComplete="new-password"
                required
                slotProps={{ htmlInput: { minLength: 8 } }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Pelo menos 8 caracteres"
              />
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? "Criando…" : "Criar conta"}
              </Button>
            </Stack>
          )}
          <Typography sx={{ mt: 3 }} color="text.secondary">
            Já tem uma conta? <a href="/login">Entrar</a>
          </Typography>
        </Paper>
      </Box>
    </>
  );
}
