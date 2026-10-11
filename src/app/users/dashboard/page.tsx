"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { downloadCsv } from "@/lib/csv";

type DashboardData = {
  user: {
    email: string;
  };
  metrics: {
    totalOrders: number;
    paidOrders: number;
    revenueCents: number;
  };
  orders: Array<{
    id: string;
    product_title: string;
    price_cents: number;
    currency: string;
    status: "draft" | "pending_payment" | "paid" | "fulfilled" | "failed";
    created_at: string;
  }>;
};

const money = (cents: number, currency = "USD") =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
  });

async function requestDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/users/dashboard", { cache: "no-store" });
  const result: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "Could not load your dashboard.";
    throw new Error(message);
  }

  return result as DashboardData;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");

  async function loadDashboard() {
    setLoading(true);
    setNotice("");
    try {
      const dashboard = await requestDashboard();
      setData(dashboard);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Loading failed.");
      if (error instanceof Error && error.message.includes("Authentication")) {
        router.replace("/users/login?next=%2Fusers%2Fdashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDashboard() {
      try {
        const dashboard = await requestDashboard();
        if (!cancelled) setData(dashboard);
      } catch (error) {
        if (cancelled) return;

        setNotice(error instanceof Error ? error.message : "Loading failed.");
        if (error instanceof Error && error.message.includes("Authentication")) {
          router.replace("/users/login?next=%2Fusers%2Fdashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialDashboard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/users/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not sign out. Please try again.");
      }
      router.replace("/users/login");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign out failed.");
      setSigningOut(false);
    }
  }

  const visibleOrders = (data?.orders ?? []).filter((order) => {
    const search = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      order.product_title.toLowerCase().includes(search) ||
      order.id.toLowerCase().includes(search);
    return matchesSearch && (orderStatus === "all" || order.status === orderStatus);
  });

  function exportOrders() {
    downloadCsv(
      "my-smartcart-orders.csv",
      ["Order ID", "Product", "Price", "Currency", "Status", "Created"],
      visibleOrders.map((order) => [
        order.id,
        order.product_title,
        (order.price_cents / 100).toFixed(2),
        order.currency,
        order.status,
        new Date(order.created_at).toISOString(),
      ]),
    );
  }

  if (loading) {
    return (
      <main className="container">
        <p>Loading your account...</p>
      </main>
    );
  }

  return (
    <main className="container dashboard">
      <header className="dashboard-header">
        <div className="hero">
          <p className="eyebrow">Customer account</p>
          <h1>Your dashboard</h1>
          <p>Review your order history and your recent SmartCart purchases.</p>
        </div>
        <button className="secondary-button" onClick={logout} disabled={signingOut}>
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <section className="metrics" aria-label="Customer metrics">
        <article className="metric-card">
          <span>Total purchases</span>
          <strong>{data?.metrics.totalOrders ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>Paid orders</span>
          <strong>{data?.metrics.paidOrders ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>Spent</span>
          <strong>{money(data?.metrics.revenueCents ?? 0)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Recent orders</h2>
            <p className="orders-summary">
              Showing {visibleOrders.length} of {data?.orders.length ?? 0} purchases
            </p>
          </div>
          <div className="section-actions">
            <button
              className="secondary-button"
              onClick={exportOrders}
              disabled={!visibleOrders.length}
            >
              Export CSV
            </button>
            <button
              className="secondary-button"
              onClick={() => void loadDashboard()}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <Link href="/" className="button-link secondary-button">
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="order-filters">
          <label className="visually-hidden" htmlFor="customer-order-search">
            Search purchases
          </label>
          <input
            id="customer-order-search"
            type="search"
            placeholder="Search products or order IDs"
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
          />
          <label className="visually-hidden" htmlFor="customer-order-status">
            Filter by order status
          </label>
          <select
            id="customer-order-status"
            value={orderStatus}
            onChange={(event) => setOrderStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_payment">Pending payment</option>
            <option value="paid">Paid</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {!data || data.orders.length === 0 ? (
          <p className="notice">No orders yet. Your purchases will appear here after checkout.</p>
        ) : !visibleOrders.length ? (
          <p className="notice">No orders match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.product_title}</td>
                    <td>{money(order.price_cents, order.currency)}</td>
                    <td>
                      <span className={`status status-${order.status}`}>
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      {order.status === "paid" || order.status === "fulfilled" ? (
                        <a
                          className="table-action"
                          href={`/api/users/orders/${encodeURIComponent(order.id)}/download`}
                        >
                          Download PDF
                        </a>
                      ) : (
                        <span className="table-pending">Available after payment</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
