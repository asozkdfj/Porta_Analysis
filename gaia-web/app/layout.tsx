import type { Metadata } from "next";
import { GaiaProviders } from "@/components/providers/GaiaProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAIA — GRR & Linearity Analysis",
  description: "CSV 기반 센서/광학 테스트 GRR 및 LIW 선형성 분석 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased min-h-screen">
        <GaiaProviders>{children}</GaiaProviders>
      </body>
    </html>
  );
}
