"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Sign-in failed.";
        throw new Error(message);
      }

      const requestedPath = new URLSearchParams(window.location.search).get(
        "next",
      );
      const destination =
        (requestedPath === "/dashboard" ||
          requestedPath?.startsWith("/dashboard/")) &&
        !requestedPath.startsWith("//")
          ? requestedPath
          : "/dashboard";

      window.location.replace(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="panel login-panel">
        <p className="eyebrow">SmartCart AI</p>
        <h1>Creator login</h1>
        <p>Sign in to manage your store and orders.</p>

        <form onSubmit={signIn}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={256}
            required
          />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
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
