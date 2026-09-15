"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import api from "@/lib/axios";
import AppIcon from "@/components/AppIcon";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token || !email) {
      setError("This reset link is incomplete. Request a new password reset email.");
      return;
    }
    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirmation,
      });
      setSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errors = err.response?.data?.errors;
        setError(errors?.password?.[0] || errors?.email?.[0] || err.response?.data?.message || "This reset link may be invalid or expired.");
      } else {
        setError("Unable to reset your password right now.");
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
          <h1>Choose a new password</h1>
          <p className="auth-intro">Use at least 8 characters. After the reset, previous API sessions are signed out for account safety.</p>
          {error && <div className="auth-message error" role="alert">{error}</div>}
          {success ? (
            <><div className="auth-message success">Your password has been updated successfully.</div><Link className="auth-submit" style={{ display: "grid", placeItems: "center" }} href="/login">Continue to sign in</Link></>
          ) : (
            <form onSubmit={submit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="new-password">New password</label>
                <div className="auth-input-wrap">
                  <AppIcon name="lock" className="auth-input-icon" />
                  <input id="new-password" className="auth-input" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                  <button className="auth-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}><AppIcon name={showPassword ? "eyeOff" : "eye"} /></button>
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="confirm-password">Confirm new password</label>
                <div className="auth-input-wrap"><AppIcon name="lock" className="auth-input-icon" /><input id="confirm-password" className="auth-input" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Repeat your new password" /></div>
              </div>
              <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Updating password..." : "Reset password"}</button>
            </form>
          )}
          {!success && <Link className="auth-back" href="/forgot-password"><AppIcon name="arrow" /> Request a new link</Link>}
        </div>
      </section>
      <aside className="auth-visual" aria-hidden="true"><div className="auth-visual-content"><div className="auth-kicker">Fresh password. Fresh session.</div><h2>Secure the account, then get right back to the work that matters.</h2><p>A successful reset invalidates old API access tokens so the new password becomes the clean starting point for the account.</p></div></aside>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="auth-panel">Loading reset form...</div>}><ResetPasswordForm /></Suspense>;
}
