// ~/puf-wallet-frontend/src/app/page.js

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/minimal')
  }, [router])

  return null
}