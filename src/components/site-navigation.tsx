import Link from "next/link";

export default function SiteNavigation() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/" aria-label="SmartCart AI home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SmartCart <span className="brand-ai">AI</span></span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link className="nav-link" href="/">
            Create a guide
          </Link>
          <Link className="nav-link" href="/users/dashboard">
            Customer orders
          </Link>
          <details className="creator-menu">
            <summary>Creator tools</summary>
            <div className="creator-menu-panel">
              <Link href="/login">Creator login</Link>
              <Link href="/dashboard">Creator dashboard</Link>
            </div>
          </details>
          <Link className="nav-login" href="/users/login">
            Customer login
          </Link>
          <Link className="nav-signup" href="/users/signup">
            Customer sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
