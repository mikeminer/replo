"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, type FormEvent } from "react";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "");
    const companyName = String(form.get("companyName") ?? "");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage("Autenticazione non configurata."); setPending(false); return; }

    const supabase = createBrowserClient(url, key);
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { full_name: fullName, company_name: companyName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(mode === "login" ? "Email o password non corretti." : "Non è stato possibile creare l'account. Verifica i dati e riprova.");
    else if (mode === "signup" && !result.data.session) setMessage("Controlla la tua email per confermare l'account.");
    else location.href = "/app";
    setPending(false);
  }

  return <form className="account-form" onSubmit={submit}>
    {mode === "signup" && <>
      <label>Nome e cognome<input required name="fullName" autoComplete="name" /></label>
      <label>Azienda<input required name="companyName" autoComplete="organization" /></label>
    </>}
    <label>Email<input required name="email" type="email" autoComplete="email" /></label>
    <label>Password<input required minLength={10} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
    {message && <p className={message.includes("confermare") ? "notice" : "notice error"}>{message}</p>}
    <button className="btn mint" disabled={pending}>{pending ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}</button>
    <button className="btn secondary" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}</button>
  </form>;
}
