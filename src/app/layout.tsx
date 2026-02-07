import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { EventProvider } from "@/context/EventContext";
import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SplitWise Clone",
  description: "Split expenses with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <EventProvider>
            <main className="container">
              {children}
            </main>
          </EventProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
