//app/layout.tsx

import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kenya Police Service - Management System",
    template: "%s | Kenya Police Service",
  },
  description: "Comprehensive digital management system for the Kenya Police Service. Manage occurrence books, criminal records, cases, personnel, and resources efficiently.",
  keywords: [
    "Kenya Police",
    "Police Management",
    "Occurrence Book",
    "Crime Management",
    "Law Enforcement",
    "Digital OB",
    "Criminal Records",
  ],
  authors: [{ name: "Kenya Police Service" }],
  creator: "Kenya Police Service",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "/",
    title: "Kenya Police Service - Management System",
    description: "Comprehensive digital management system for the Kenya Police Service",
    siteName: "Kenya Police Service",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Kenya Police Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kenya Police Service - Management System",
    description: "Comprehensive digital management system for the Kenya Police Service",
    images: ["/images/twitter-image.jpg"],
    creator: "@PoliceKE",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#003f87" />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} antialiased min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}