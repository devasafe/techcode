import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Providers } from "@/components/Providers"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Tech Code",
  description: "Gestão de laboratório de eletrônica automotiva",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
