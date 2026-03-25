import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { TopBar } from '@/components/top-bar'
import './globals.css'

export const metadata: Metadata = {
  title: 'PMU Student Registration System',
  description: 'Prince Mohammad Bin Fahd University - Student Registration and Course Management System',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen flex flex-col font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <TopBar />
            <div className="flex-1 min-h-0 flex flex-col">{children}</div>
            <footer className="border-t border-border/60 bg-white dark:bg-white">
              <div className="w-full py-0">
                <img
                  src="/underpagebuildingpmu.png"
                  alt="Under page building"
                  className="block h-auto w-full object-contain"
                />
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
