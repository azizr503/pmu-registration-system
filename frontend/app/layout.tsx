import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { TopBar } from '@/components/top-bar'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { Toaster } from '@/components/ui/sonner'
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
      <body
        className={`min-h-screen flex flex-col bg-[#f5f5f5] font-sans transition-colors duration-300 dark:bg-[#0f1117] ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="pmu-theme"
          themes={['light', 'dark']}
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            <Toaster richColors position="top-center" />
            <TopBar />
            <div className="flex-1 min-h-0 flex flex-col">{children}</div>
            <ConditionalFooter />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
