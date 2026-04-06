"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

const LoginContent = dynamic(() => import("@/components/LoginContent"), { ssr: false })

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
