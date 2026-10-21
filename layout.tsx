import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bimedbd · Quản lý thiết bị y tế",
  description: "Tra cứu thiết bị, quản lý QR, sửa chữa và gói thầu.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
