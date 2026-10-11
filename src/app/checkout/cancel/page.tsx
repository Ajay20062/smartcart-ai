import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="container">
      <section className="panel">
        <h1>Checkout cancelled</h1>
        <p>
          No completed payment was confirmed by SmartCart AI. You can return to
          the home page to create a new order.
        </p>
        <Link className="button-link" href="/">
          Return to SmartCart AI
        </Link>
      </section>
    </main>
  );
}
