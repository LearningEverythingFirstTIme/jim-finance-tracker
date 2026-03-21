import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { HapticsProvider } from "@/components/haptics-provider";
import { AuthGuard } from "@/components/auth-guard";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jim's Finance Tracker",
  description: "Track every dollar, from subscriptions to coffee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <HapticsProvider>
            <AuthProvider>
            <AuthGuard>
              <Navigation />
              <main className="min-h-screen pt-14">
                <div className="max-w-7xl mx-auto p-4 md:p-6">
                  {children}
                </div>
              </main>
            </AuthGuard>
            <Toaster />
          </AuthProvider>
          </HapticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
