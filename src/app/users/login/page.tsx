"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function UserLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users/login", {
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

      const requestedPath = searchParams.get("next");
      const destination =
        (requestedPath === "/users/dashboard" ||
          requestedPath?.startsWith("/users/dashboard/")) &&
        !requestedPath.startsWith("//")
          ? requestedPath
          : "/users/dashboard";

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
        <h1>Customer login</h1>
        <p>Access your saved products and order history.</p>

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
          <Link href="/users/signup" className="button-link secondary-button">
            Create an account
          </Link>
          <Link href="/" className="button-link secondary-button">
            Back to storefront
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function UserLoginPage() {
  return (
    <Suspense fallback={<main className="container"><section className="panel login-panel"><p className="eyebrow">SmartCart AI</p><h1>Customer login</h1><p>Loading...</p></section></main>}>
      <UserLoginForm />
    </Suspense>
  );
}
