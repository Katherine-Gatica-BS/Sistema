import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inventario Conos",
  description: "Gestión de inventario de conos de cortinas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Conos",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script src="/register-sw.js" defer />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen max-w-lg mx-auto">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
