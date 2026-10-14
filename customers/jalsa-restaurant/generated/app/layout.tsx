import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jalsa Restaurant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="c-skip" href="#main">Skip to content</a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
