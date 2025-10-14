import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Wallet Insights - Stacks Blockchain Analytics",
  description: "Analyze any Stacks wallet address with AI-powered insights and interactive chat assistant",
  keywords: "Stacks, blockchain, wallet, analytics, AI, cryptocurrency",
  authors: [{ name: "AI Wallet Insights" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} gradient-bg min-h-screen antialiased`}>
        <div className="particles">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
        {children}
      </body>
    </html>
  );
}
