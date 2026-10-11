import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Link href="/">SmartCart AI</Link>
          <p>Personalized digital guides, made around you.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/">Create a guide</Link>
          <Link href="/users/dashboard">Customer orders</Link>
          <Link href="/users/login">Customer login</Link>
          <Link href="/users/signup">Create account</Link>
          <Link href="/login">Creator login</Link>
          <Link href="/dashboard">Creator dashboard</Link>
        </nav>
        <p className="footer-copyright">© SmartCart AI</p>
      </div>
    </footer>
  );
}