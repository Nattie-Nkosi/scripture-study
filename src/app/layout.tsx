import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Fraunces } from "next/font/google";
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

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

// Display serif with character — used for titles, not body text.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${fraunces.variable} h-full antialiased`}
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
