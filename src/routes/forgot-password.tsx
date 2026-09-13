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

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setSent(true);
  };
  return (
    <>
      <Box className="auth-page">
        <Box className="auth-theme-toggle">
          <ThemeToggle />
        </Box>
        <Paper className="auth-card" component="main">
          <Typography variant="h1">Redefinir senha</Typography>
          <Typography color="text.secondary">
            Enviaremos um link para redefinir sua senha.
          </Typography>
          {sent ? (
            <Alert severity="success" sx={{ mt: 3 }}>
              Se este e-mail estiver cadastrado, você receberá um link para
              redefinir sua senha.
            </Alert>
          ) : (
            <Stack
              component="form"
              spacing={2}
              onSubmit={submit}
              sx={{ mt: 3 }}
            >
              <TextField
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="contained">
                Enviar link de recuperação
              </Button>
            </Stack>
          )}
          <Button component="a" href="/login" sx={{ mt: 2 }}>
            Voltar para entrar
          </Button>
        </Paper>
      </Box>
    </>
  );
}
