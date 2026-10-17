"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store-context";

export default function AccountPage() {
  const router = useRouter();
  const { email, signIn, register, signOut, token, setNotice } = useStore();
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(emailInput, password);
        router.push("/shop");
      } else {
        await register(emailInput, password);
        setMode("signin");
        setPassword("");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  if (token) return <section className="account-panel"><div className="account-avatar">{email.slice(0, 1).toUpperCase()}</div><p className="eyebrow">YOUR ORDERFLOW ACCOUNT</p><h1>Good to have you here.</h1><p className="account-email">Signed in as <strong>{email}</strong></p><div className="account-actions"><Link className="button button-dark" href="/orders">View your orders <span>→</span></Link><button className="button button-quiet" onClick={() => { signOut(); router.push("/"); }}>Sign out</button></div></section>;

  return <section className="account-layout"><div className="account-aside"><p className="eyebrow">YOUR LITTLE CORNER</p><h1>Good to see<br /><em>you here.</em></h1><p>Sign in to keep your cart close and your orders in view.</p><div className="account-aside-art"><span>✳</span><small>GOOD THINGS<br />ARE WAITING</small></div></div><form className="account-form" onSubmit={submit}><p className="eyebrow">{mode === "signin" ? "WELCOME BACK" : "JOIN ORDERFLOW"}</p><h2>{mode === "signin" ? "Sign in to continue" : "Create your account"}</h2><p className="form-help">{mode === "signin" ? "Your next favorite is just around the corner." : "A better shopping experience starts here."}</p><label>Email address<input required type="email" autoComplete="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength={10} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /></label><button className="button button-dark form-submit" disabled={busy}>{busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}<span>→</span></button><p className="mode-switch">{mode === "signin" ? "New to OrderFlow?" : "Already have an account?"} <button type="button" onClick={() => setMode(mode === "signin" ? "register" : "signin")}>{mode === "signin" ? "Create an account" : "Sign in"}</button></p></form></section>;
}
