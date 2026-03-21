import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { HapticsProvider } from "@/components/haptics-provider";
import { AuthGuard } from "@/components/auth-guard";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jim's Finance Tracker",
  description: "Track every dollar, from subscriptions to coffee",
  // PWA / installability metadata
  appleWebApp: {
    capable: true,
    title: "Jim's Finance",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Android Chrome "Add to Home Screen" banner support
    "mobile-web-app-capable": "yes",
  },
};

// Separate Viewport export (required by Next.js 13+ for themeColor)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ff6b35" },
    { media: "(prefers-color-scheme: dark)",  color: "#ff8c5a" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
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
        {/* Registers /sw.js and handles update notifications */}
        <PwaRegister />
      </body>
    </html>
  );
}
