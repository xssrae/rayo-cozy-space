import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signup")({ component: SignupPage });
function SignupPage() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [success, setSuccess] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const result = await authClient.signUp.email({ name, email, password, callbackURL: "/overview" }); setBusy(false);
    if (result.error) setMessage(result.error.message ?? "Could not create your account."); else setSuccess(true);
  };
  return <><Box className="auth-page"><Paper className="auth-card" component="main">
    <Box className="auth-brand"><Sparkles size={20} /><Typography variant="h5">rayo plan</Typography></Box>
    <Typography variant="h1">Create your workspace</Typography><Typography color="text.secondary">A quieter place for steady progress.</Typography>
    {success ? <Alert severity="success" sx={{ mt: 3 }}>Check your email to verify your account, then <a href="/login">sign in</a>.</Alert> :
    <Stack component="form" spacing={2} onSubmit={submit} sx={{ mt: 3 }}>
      {message && <Alert severity="error">{message}</Alert>}
      <TextField label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Password" type="password" autoComplete="new-password" required slotProps={{ htmlInput: { minLength: 8 } }} value={password} onChange={(e) => setPassword(e.target.value)} helperText="At least 8 characters" />
      <Button type="submit" variant="contained" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
    </Stack>}
    <Typography sx={{ mt: 3 }} color="text.secondary">Already have an account? <a href="/login">Sign in</a></Typography>
  </Paper></Box></>;
}
