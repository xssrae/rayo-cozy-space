import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: typeof search["redirect"] === "string" ? search["redirect"] : "/overview" }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate(); const { redirect } = Route.useSearch();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const result = await authClient.signIn.email({ email, password }); setBusy(false);
    if (result.error) setMessage(result.error.message ?? "Could not sign in.");
    else await navigate({ href: redirect });
  };
  return <><Box className="auth-page"><Paper className="auth-card" component="main">
    <Box className="auth-brand"><Sparkles size={20} /><Typography variant="h5">rayo plan</Typography></Box>
    <Typography variant="h1">Boas-vindas de volta</Typography><Typography color="text.secondary">Return to your calm workspace.</Typography>
    <Stack component="form" spacing={2} onSubmit={submit} sx={{ mt: 3 }}>
      {message && <Alert severity="error">{message}</Alert>}
      <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" variant="contained" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      <Button component={Link} to="/forgot-password" size="small">Forgot password?</Button>
    </Stack>
    <Typography sx={{ mt: 3 }} color="text.secondary">New here? <Link to="/signup">Create an account</Link></Typography>
  </Paper></Box></>;
}
