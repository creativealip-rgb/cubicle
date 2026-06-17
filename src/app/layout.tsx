import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// ClickUp spec: Plus Jakarta Sans (display/headings), Inter (body/meta), Geist Mono (technical/code)
// Note: Plus Jakarta Sans doesn't expose weight 650; use 700 (closest)
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://cubicle.168-144-37-19.sslip.io"),
  title: {
    default: "Cubicle — Client Operations Hub",
    template: "%s | Cubicle",
  },
  description:
    "Manage client work from request to invoice. Cubicle helps freelancers and small service teams manage clients, projects, files, time tracking, invoices, booking, and client portals.",
  keywords: [
    "client operations hub",
    "client portal",
    "freelancer CRM",
    "agency project management",
    "time tracking invoicing",
    "client work management",
  ],
  authors: [{ name: "Cubicle" }],
  creator: "Cubicle",
  publisher: "Cubicle",
  openGraph: {
    title: "Cubicle — Run client work from request to invoice",
    description:
      "One calm workspace for clients, projects, tasks, files, time tracking, invoices, booking, and client portals.",
    url: "/",
    siteName: "Cubicle",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cubicle — Client Operations Hub",
    description:
      "Manage client work from request to invoice in one calm workspace.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
