import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "AI 許願池",
  description: "把工作中最麻煩的問題收集起來，讓數位創新處評估 AI 解決方案",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="bg-[#F5F5F5] text-[#424242] antialiased min-h-screen">
        <SiteNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
