import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteNavigation from "../components/site-navigation";
import SiteFooter from "../components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartCart AI",
  description: "Create personalized digital products with SmartCart AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteNavigation />
        <div className="site-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
