import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pohjoinen Report Agent",
  description: "AI-powered monthly performance report",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
