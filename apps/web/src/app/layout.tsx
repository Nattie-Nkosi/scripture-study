import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { CommandPalette } from "@/components/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// One serif family for reading and titles; its optical-size axis lets the
// same face read as a fine display cut at large sizes and a sturdy text cut
// at body sizes.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Scripture Study",
    template: "%s · Scripture Study",
  },
  description:
    "A clean, modern reader for the LDS standard works with AI-powered study tools.",
  applicationName: "Scripture Study",
  appleWebApp: {
    capable: true,
    title: "Scripture",
    statusBarStyle: "default",
  },
};

// Tint the mobile browser chrome to match the reading surface (paper in light,
// warm charcoal in dark) so the app feels native on a phone.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#211e1b" },
  ],
  // Extend the app under the status bar / home indicator on notched phones; the
  // chrome elements pad themselves back with env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={["light", "sepia", "dark", "night", "twilight"]}
          disableTransitionOnChange
        >
          {children}
          <CommandPalette />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
