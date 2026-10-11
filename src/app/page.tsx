"use client";

import { useState } from "react";
import {
  isProductFormat,
  productFormats,
  starterPrompts,
  type ProductFormat,
} from "@/lib/product-options";

type ProductResult = {
  orderId: string;
  deliveryToken: string;
  title: string;
  preview: string;
  priceCents: number;
  currency: string;
  creatorName: string;
  brandDescription: string;
};

function isProductResult(value: unknown): value is ProductResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "orderId" in value &&
    typeof value.orderId === "string" &&
    "deliveryToken" in value &&
    typeof value.deliveryToken === "string" &&
    /^[a-f0-9]{64}$/.test(value.deliveryToken) &&
    "title" in value &&
    typeof value.title === "string" &&
    "preview" in value &&
    typeof value.preview === "string" &&
    "priceCents" in value &&
    typeof value.priceCents === "number" &&
    Number.isInteger(value.priceCents) &&
    "currency" in value &&
    value.currency === "USD" &&
    "creatorName" in value &&
    typeof value.creatorName === "string" &&
    "brandDescription" in value &&
    typeof value.brandDescription === "string"
  );
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [request, setRequest] = useState("");
  const [format, setFormat] = useState<ProductFormat>("guide");
  const [product, setProduct] = useState<ProductResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateProduct() {
    setLoading(true);
    setError("");
    setProduct(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, request, format }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Generation failed.";
        throw new Error(message);
      }

      if (!isProductResult(data)) {
        throw new Error("The server returned an invalid product response.");
      }

      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function payNow() {
    if (!product) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: product.orderId }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Checkout failed.";
        throw new Error(message);
      }

      const approvalUrl =
        typeof data === "object" &&
        data !== null &&
        "approvalUrl" in data &&
        typeof data.approvalUrl === "string"
          ? data.approvalUrl
          : "";

      if (!approvalUrl) {
        throw new Error("PayPal approval link is missing.");
      }

      sessionStorage.setItem(
        "smartcart_delivery_token",
        product.deliveryToken,
      );
      window.location.assign(approvalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setLoading(false);
    }
  }

  return (
    <main className="container storefront">
      <div className="storefront-grid">
        <section className="hero hero-copy">
          <p className="eyebrow eyebrow-pill">
            <span className="eyebrow-dot" aria-hidden="true" />
            {product?.creatorName || "Your personal idea-to-plan studio"}
          </p>
          <h1>
            Make your next idea feel <span>doable.</span>
          </h1>
          <p className="hero-description">
            {product?.brandDescription ||
              "Tell us what you’re working toward. Get a practical, personalized guide made around you—not a one-size-fits-all template."}
          </p>

          <div className="hero-steps" aria-label="How SmartCart works">
            <div>
              <span className="step-number">01</span>
              <span>Share your goal</span>
            </div>
            <span className="step-connector" aria-hidden="true" />
            <div>
              <span className="step-number">02</span>
              <span>Get your guide</span>
            </div>
            <span className="step-connector" aria-hidden="true" />
            <div>
              <span className="step-number">03</span>
              <span>Make it happen</span>
            </div>
          </div>

          <div className="trust-note">
            <span className="trust-icon" aria-hidden="true">✓</span>
            <p>
              Personalized for you <span>·</span> Clear upfront pricing{" "}
              <span>·</span> Secure checkout
            </p>
          </div>
        </section>

        <section className="panel generator-panel" aria-labelledby="create-heading">
          <div className="form-heading">
            <span className="form-step">LET’S GET STARTED</span>
            <h2 id="create-heading">What are you working on?</h2>
            <p>A little context helps us make your guide more useful.</p>
          </div>

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            required
          />

          <label htmlFor="request">Describe what you need</label>
          <div className="prompt-options" aria-label="Starter prompts">
            <span>Try a starter:</span>
            {starterPrompts.map((starter) => (
              <button
                className="prompt-chip"
                key={starter.label}
                type="button"
                onClick={() => setRequest(starter.prompt)}
                aria-pressed={request === starter.prompt}
              >
                {starter.label}
              </button>
            ))}
          </div>
          <textarea
            id="request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="For example: a 7-day beginner workout plan with short daily sessions..."
            rows={5}
            maxLength={2000}
            required
          />
          <div className="field-meta">
            <p className="field-hint">
              A few sentences is plenty. Be as specific as you like.
            </p>
            <span className="character-count">{request.length}/2000</span>
          </div>

          <label htmlFor="format">Choose a format</label>
          <select
            id="format"
            value={format}
            onChange={(event) => {
              if (isProductFormat(event.target.value)) {
                setFormat(event.target.value);
              }
            }}
          >
            {productFormats.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            className="primary-action"
            type="button"
            onClick={generateProduct}
            disabled={loading || !email.trim() || request.trim().length < 10}
          >
            {loading ? "Creating your guide..." : "Create my guide"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="form-privacy">
            Your details are only used to prepare your order.
          </p>
        </section>
      </div>

      {product && (
        <section className="panel result" aria-labelledby="preview-heading">
          <div className="result-heading">
            <p className="eyebrow eyebrow-pill">Your guide is ready</p>
            <h2 id="preview-heading">{product.title}</h2>
          </div>
          <p className="result-preview">
            {product.preview}
            {product.preview.length >= 500 ? "…" : ""}
          </p>
          <div className="result-purchase">
            <div>
              <span className="result-label">One-time price</span>
              <div className="price">
                {(product.priceCents / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: product.currency,
                })}
              </div>
            </div>
            <button className="primary-action" type="button" onClick={payNow} disabled={loading}>
              {loading ? "Connecting to PayPal..." : "Continue to secure checkout"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </div>
          <p className="fine-print">
            Your downloadable guide is available as soon as payment is verified.
          </p>
        </section>
      )}
    </main>
  );
}
