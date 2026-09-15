"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import axios from "axios";
import api from "@/lib/axios";
import AppIcon from "@/components/AppIcon";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/forgot-password", { email: email.trim() });
      setMessage(response.data?.message || "If an account exists for that email, a reset link has been sent.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Unable to send a reset link right now.");
      } else {
        setError("Unable to send a reset link right now.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo"><div className="auth-logo-mark">F</div><div className="auth-logo-text">FlowTask</div></div>
          <h1>Reset your password</h1>
          <p className="auth-intro">Enter the email connected to your account. We&apos;ll send a secure link you can use to choose a new password.</p>
          {error && <div className="auth-message error" role="alert">{error}</div>}
          {message && <div className="auth-message success" role="status">{message}</div>}
          <form onSubmit={submit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email address</label>
              <div className="auth-input-wrap">
                <AppIcon name="mail" className="auth-input-icon" />
                <input id="email" className="auth-input" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Sending link..." : "Send reset link"}</button>
          </form>
          <Link className="auth-back" href="/login"><AppIcon name="arrow" /> Back to sign in</Link>
        </div>
      </section>
      <aside className="auth-visual" aria-hidden="true"><div className="auth-visual-content"><div className="auth-kicker">Secure account recovery</div><h2>Get back to your work in a few simple steps.</h2><p>Reset links are time-limited, existing API sessions are revoked after a successful reset, and the public request never reveals whether an email exists in the system.</p></div></aside>
    </div>
  );
}
