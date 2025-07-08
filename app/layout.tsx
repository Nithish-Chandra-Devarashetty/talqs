import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import NextAuthSessionProvider from "./session-provider"
import { StoreOAuthUserToLocalStorage } from "@/components/store-google-user";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "TALQS - AI-Powered Legal Summarization and Q&A",
  description:
    "Upload your legal judgment files, ask case-specific questions, and get instant summaries with voice output using advanced AI.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <NextAuthSessionProvider>
          <StoreOAuthUserToLocalStorage />
          <AuthProvider>
            <ThemeProvider 
              attribute="class" 
              defaultTheme="system" 
              enableSystem 
              disableTransitionOnChange
              storageKey="talqs-theme-preference"
            >
              {children}
            </ThemeProvider>
          </AuthProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  )
}

import './globals.css'