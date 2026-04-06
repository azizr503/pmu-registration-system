"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

const RegisterContent = dynamic(() => import("@/components/RegisterContent"), { ssr: false })

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
