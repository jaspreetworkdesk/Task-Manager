"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import api from "@/lib/axios";
import AppIcon from "@/components/AppIcon";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/login", {
        email: email.trim(),
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "We could not sign you in. Check your details and try again.");
      } else {
        setError("We could not sign you in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-mark">F</div>
            <div className="auth-logo-text">FlowTask</div>
          </div>

          <h1>Welcome back</h1>
          <p className="auth-intro">Sign in to see what needs your attention, update work and keep every deadline visible.</p>

          {error && <div className="auth-message error" role="alert">{error}</div>}

          <form onSubmit={handleLogin} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email address</label>
              <div className="auth-input-wrap">
                <AppIcon name="mail" className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="auth-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <AppIcon name="lock" className="auth-input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="auth-eye" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>
                  <AppIcon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>
            </div>

            <div className="auth-row">
              <span />
              <Link className="auth-link" href="/forgot-password">Forgot password?</Link>
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing you in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>

      <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual-content">
          <div className="auth-kicker">One workspace. Clear priorities.</div>
          <h2>Move work forward without losing track of the details.</h2>
          <p>Projects, ownership, deadlines and progress stay connected so your team can spend less time chasing updates.</p>
          <div className="auth-preview">
            <div className="preview-card">
              <div className="preview-label">Today&apos;s focus</div>
              <div className="preview-list">
                <div className="preview-task"><span className="preview-dot" /> Review website launch checklist</div>
                <div className="preview-task"><span className="preview-dot" /> Confirm client handoff</div>
                <div className="preview-task"><span className="preview-dot" /> Update sprint priorities</div>
              </div>
            </div>
            <div className="preview-card">
              <div className="preview-label">Completed this week</div>
              <div className="preview-value">24</div>
              <div className="preview-label" style={{ marginTop: 8 }}>Work stays visible from start to finish.</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
