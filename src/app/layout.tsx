import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "李氏家谱 · 一脉相承，循根问祖",
  description: "一字一句，皆为来处。李氏家乘是一处温暖、私密的家族记忆空间：寻访世系、阅读人物小传、珍藏老谱与家族故事。",
  applicationName: "李氏家谱 JIACHENG",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/fonts/heritage-serif.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
