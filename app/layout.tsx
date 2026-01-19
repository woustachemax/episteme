import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Episteme",
  description: "📖",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}