import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/reset-password")({ validateSearch: (s: Record<string, unknown>) => ({ token: typeof s["token"] === "string" ? s["token"] : "" }), component: ResetPasswordPage });
function ResetPasswordPage() {
  const { token } = Route.useSearch(); const [password, setPassword] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); const result = await authClient.resetPassword({ token, newPassword: password }); if (result.error) setError(result.error.message ?? "This link is invalid or expired."); else setDone(true); };
  return <><Box className="auth-page"><Paper className="auth-card" component="main">
    <Typography variant="h1">Choose a new password</Typography>{done ? <Alert severity="success" sx={{ mt: 3 }}>Password updated. <a href="/login">Sign in</a>.</Alert> : <Stack component="form" spacing={2} onSubmit={submit} sx={{ mt: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}<TextField label="New password" type="password" required slotProps={{ htmlInput: { minLength: 8 } }} value={password} onChange={(e) => setPassword(e.target.value)} /><Button type="submit" variant="contained" disabled={!token}>Update password</Button>
    </Stack>}
  </Paper></Box></>;
}
