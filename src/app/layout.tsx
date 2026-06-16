import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cubicle.168.144.37.19.sslip.io"),
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
