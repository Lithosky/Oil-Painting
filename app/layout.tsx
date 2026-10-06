import type { Metadata } from "next";
import "./globals.css";
import StudioShell from "@/components/StudioShell";
export const metadata: Metadata = {
  title: "无边春 · 油画调色与素描画室",
  description:
    "从观察到动手，每天练习调色、明暗、透视和排线。初学者的互动绘画画室。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <StudioShell>{children}</StudioShell>
      </body>
    </html>
  );
}
