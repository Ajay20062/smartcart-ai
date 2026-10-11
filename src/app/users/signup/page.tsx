"use client";

import Link from "next/link";
import { useState } from "react";

export default function UserSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Account creation failed.";
        throw new Error(message);
      }

      window.location.replace("/users/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed.");
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="panel login-panel">
        <p className="eyebrow">SmartCart AI</p>
        <h1>Create your account</h1>
        <p>Save your order history and keep track of your digital purchases.</p>

        <form onSubmit={signUp}>
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
          />

          <label htmlFor="password">Password</label>
          <p className="field-hint">Use at least 8 characters.</p>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={256}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label htmlFor="confirmPassword">Confirm password</label>
          <div className="password-field">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={256}
              aria-invalid={passwordsMismatch}
              aria-describedby={
                passwordsMismatch ? "password-mismatch" : undefined
              }
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={
                showConfirmPassword
                  ? "Hide confirmation password"
                  : "Show confirmation password"
              }
              aria-pressed={showConfirmPassword}
              onClick={() =>
                setShowConfirmPassword((visible) => !visible)
              }
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {passwordsMismatch && (
            <p id="password-mismatch" className="error" role="status">
              Passwords do not match.
            </p>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-links">
          <Link href="/users/login" className="button-link secondary-button">
            Customer login
          </Link>
          <Link href="/" className="button-link secondary-button">
            Back to storefront
          </Link>
        </div>
      </section>
    </main>
  );
}
