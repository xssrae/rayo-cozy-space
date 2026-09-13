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
import { useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/theme";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s["token"] === "string" ? s["token"] : "",
  }),
  component: ResetPasswordPage,
});
function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await authClient.resetPassword({
      token,
      newPassword: password,
    });
    if (result.error) setError("Este link é inválido ou expirou.");
    else setDone(true);
  };
  return (
    <>
      <Box className="auth-page">
        <Box className="auth-theme-toggle">
          <ThemeToggle />
        </Box>
        <Paper className="auth-card" component="main">
          <Typography variant="h1">Escolha uma nova senha</Typography>
          {done ? (
            <Alert severity="success" sx={{ mt: 3 }}>
              Senha atualizada. <a href="/login">Entrar</a>.
            </Alert>
          ) : (
            <Stack
              component="form"
              spacing={2}
              onSubmit={submit}
              sx={{ mt: 3 }}
            >
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Nova senha"
                type="password"
                required
                slotProps={{ htmlInput: { minLength: 8 } }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={!token}>
                Atualizar senha
              </Button>
            </Stack>
          )}
        </Paper>
      </Box>
    </>
  );
}
