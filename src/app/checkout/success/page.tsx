"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CheckoutSuccessPage() {
  const [message, setMessage] = useState("Verifying your payment...");
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    let active = true;

    async function verifyPayment() {
      const paypalOrderId = new URLSearchParams(
        window.location.search,
      ).get("token");
      const deliveryToken = sessionStorage.getItem(
        "smartcart_delivery_token",
      );

      if (!paypalOrderId || !deliveryToken) {
        if (active) {
          setMessage(
            "We couldn't locate your order. Please contact the creator with your payment details.",
          );
        }
        return;
      }

      try {
        const response = await fetch("/api/checkout/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypalOrderId }),
        });
        const data: unknown = await response.json();
        const paid =
          typeof data === "object" &&
          data !== null &&
          "paid" in data &&
          data.paid === true;

        if (!response.ok || !paid) {
          const errorMessage =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Payment is not confirmed.";
          throw new Error(errorMessage);
        }

        if (active) {
          setDownloadUrl(`/api/delivery/${deliveryToken}`);
          setMessage("Payment verified! Your product is ready.");
        }
      } catch {
        if (active) {
          setMessage(
            "Payment verification is pending. Please refresh in a moment or contact support if you were charged.",
          );
        }
      }
    }

    void verifyPayment();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="container">
      <section className="panel" aria-labelledby="order-status">
        <p className="eyebrow">SmartCart AI checkout</p>
        <h1 id="order-status">Order status</h1>
        <p role="status" aria-live="polite">
          {message}
        </p>

        {downloadUrl && (
          <>
            <a className="button-link" href={downloadUrl}>
              Download your PDF
            </a>
            <div className="account-followup">
              <h2>Keep your purchase handy</h2>
              <p>
                Create or sign in to an account using the same email you used
                at checkout to access this order from your dashboard later.
              </p>
              <div className="auth-links">
                <Link
                  href="/users/signup"
                  className="button-link secondary-button"
                >
                  Create an account
                </Link>
                <Link
                  href="/users/login"
                  className="button-link secondary-button"
                >
                  Sign in
                </Link>
                <Link href="/" className="button-link secondary-button">
                  Make another guide
                </Link>
              </div>
            </div>
          </>
        )}

        <p className="fine-print">
          Keep your download link private. If payment verification is delayed,
          your order may need a moment to update.
        </p>
      </section>
    </main>
  );
}
