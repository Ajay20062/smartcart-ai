"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { downloadCsv } from "@/lib/csv";

type DashboardData = {
  settings: {
    creator_name: string;
    creator_email: string;
    base_price_cents: number;
    brand_description: string;
  } | null;
  metrics: {
    totalOrders: number;
    paidOrders: number;
    revenueCents: number;
  };
  orders: Array<{
    id: string;
    customer_email: string | null;
    product_title: string;
    price_cents: number;
    currency: string;
    status: string;
    created_at: string;
  }>;
};

const money = (cents: number, currency = "USD") =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
  });

function getErrorMessage(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

async function requestDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  const result: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Could not load dashboard."));
  }

  return result as DashboardData;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [storeName, setStoreName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [basePrice, setBasePrice] = useState("9.00");
  const [description, setDescription] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const dashboard = await requestDashboard();
      setData(dashboard);
      if (dashboard.settings) {
        setStoreName(dashboard.settings.creator_name);
        setCreatorEmail(dashboard.settings.creator_email);
        setBasePrice(
          (Number(dashboard.settings.base_price_cents) / 100).toFixed(2),
        );
        setDescription(dashboard.settings.brand_description);
      }
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Loading failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const dashboard = await requestDashboard();
        if (cancelled) return;

        setData(dashboard);
        if (dashboard.settings) {
          setStoreName(dashboard.settings.creator_name);
          setCreatorEmail(dashboard.settings.creator_email);
          setBasePrice(
            (Number(dashboard.settings.base_price_cents) / 100).toFixed(2),
          );
          setDescription(dashboard.settings.brand_description);
        }
        setNotice("");
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error instanceof Error ? error.message : "Loading failed.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");

    const parsedPrice = Number(basePrice);
    if (!Number.isFinite(parsedPrice)) {
      setNotice("Enter a valid base price.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName: storeName,
          creatorEmail,
          brandDescription: description,
          basePriceCents: Math.round(parsedPrice * 100),
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Could not save settings."));
      }

      await loadDashboard();
      setNotice("Store settings saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Saving failed.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not sign out. Please try again.");
      }
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign out failed.");
    }
  }

  const visibleOrders = (data?.orders ?? []).filter((order) => {
    const search = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      order.id.toLowerCase().includes(search) ||
      order.product_title.toLowerCase().includes(search) ||
      (order.customer_email ?? "").toLowerCase().includes(search);
    return matchesSearch && (orderStatus === "all" || order.status === orderStatus);
  });

  function exportOrders() {
    downloadCsv(
      "smartcart-orders.csv",
      ["Order ID", "Product", "Customer email", "Price", "Currency", "Status", "Created"],
      visibleOrders.map((order) => [
        order.id,
        order.product_title,
        order.customer_email,
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
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="container dashboard">
      <header className="dashboard-header">
        <div className="hero">
          <p className="eyebrow">Creator workspace</p>
          <h1>Store dashboard</h1>
          <p>Manage your brand, pricing, and recent customer orders.</p>
        </div>
        <button className="secondary-button" onClick={logout}>
          Sign out
        </button>
      </header>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      <section className="metrics" aria-label="Store metrics">
        <article className="metric-card">
          <span>Total orders</span>
          <strong>{data?.metrics.totalOrders ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>Paid orders</span>
          <strong>{data?.metrics.paidOrders ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>Recorded revenue</span>
          <strong>{money(data?.metrics.revenueCents ?? 0)}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Store settings</h2>
        <form onSubmit={saveSettings}>
          <label htmlFor="storeName">Store name</label>
          <input
            id="storeName"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            maxLength={160}
            required
          />

          <label htmlFor="creatorEmail">Creator email</label>
          <input
            id="creatorEmail"
            type="email"
            value={creatorEmail}
            onChange={(event) => setCreatorEmail(event.target.value)}
            maxLength={254}
            required
          />

          <label htmlFor="basePrice">Base price (USD)</label>
          <input
            id="basePrice"
            type="number"
            min="1"
            max="1000"
            step="0.01"
            value={basePrice}
            onChange={(event) => setBasePrice(event.target.value)}
            required
          />

          <label htmlFor="description">Brand description</label>
          <textarea
            id="description"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading orders-heading">
          <div>
            <h2>Recent orders</h2>
            <p className="orders-summary">
              Showing {visibleOrders.length} of {data?.orders.length ?? 0} loaded orders
            </p>
          </div>
          <div className="section-actions">
            <button className="secondary-button" onClick={exportOrders} disabled={!visibleOrders.length}>
              Export CSV
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setLoading(true);
                void loadDashboard();
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="order-filters">
          <label className="visually-hidden" htmlFor="creator-order-search">
            Search orders
          </label>
          <input
            id="creator-order-search"
            type="search"
            placeholder="Search order, product, or customer"
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
          />
          <label className="visually-hidden" htmlFor="creator-order-status">
            Filter by order status
          </label>
          <select
            id="creator-order-status"
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

        {!data?.orders.length ? (
          <p>No orders yet. Your first customer order will appear here.</p>
        ) : !visibleOrders.length ? (
          <p className="notice">No orders match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id.slice(0, 8)}</td>
                    <td>{order.product_title}</td>
                    <td>{order.customer_email ?? "—"}</td>
                    <td>{money(order.price_cents, order.currency)}</td>
                    <td>
                      <span className={`status status-${order.status}`}>
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      {new Date(order.created_at).toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link className="button-link" href="/">
        Open customer storefront
      </Link>
    </main>
  );
}
