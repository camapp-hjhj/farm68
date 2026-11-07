import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farm 68 · Xóm mình cùng tốt lên",
  description: "Không gian chung cho hành trình 68 ngày.",
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
