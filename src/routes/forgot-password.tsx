import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });
function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }); setSent(true); };
  return <><Box className="auth-page"><Paper className="auth-card" component="main">
    <Typography variant="h1">Reset password</Typography><Typography color="text.secondary">We will send a private reset link.</Typography>
    {sent ? <Alert severity="success" sx={{ mt: 3 }}>If that address exists, a reset link is on its way.</Alert> : <Stack component="form" spacing={2} onSubmit={submit} sx={{ mt: 3 }}>
      <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><Button type="submit" variant="contained">Send reset link</Button>
    </Stack>}<Button component="a" href="/login" sx={{ mt: 2 }}>Back to sign in</Button>
  </Paper></Box></>;
}
