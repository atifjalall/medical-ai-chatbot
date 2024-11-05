'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function WaitingRoom() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Rate Limit Exceeded</h1>
        <p>Please wait {countdown} seconds before trying again.</p>
      </div>
    </div>
  )
}