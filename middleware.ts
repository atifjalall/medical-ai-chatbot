// middleware.ts
import type { NextFetchEvent, NextRequest } from 'next/server'
import { kasadaHandler } from './lib/kasada/kasada-server'

const MAX_REQUESTS = 50
const WINDOW_SIZE_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Using Response object as storage
const storage = new Response(null).headers

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return kasadaHandler(req, ev)
  }

  if (req.method === 'POST') {
    const ip = req.headers.get('x-real-ip') ?? 'anonymous'
    const now = Date.now()
    const windowKey = `${ip}:${Math.floor(now / WINDOW_SIZE_MS)}`

    try {
      // Get current count and timestamp
      const currentData = storage.get(windowKey)
      const [count, timestamp] = currentData
        ? currentData.split(':').map(Number)
        : [0, now]

      // Reset count if window expired
      const newCount = now - timestamp > WINDOW_SIZE_MS ? 1 : count + 1

      // Store new count and timestamp
      storage.set(windowKey, `${newCount}:${now}`)

      // Check rate limit
      if (newCount > MAX_REQUESTS) {
        // Calculate remaining time in the current window
        const resetTime = timestamp + WINDOW_SIZE_MS
        const retryAfter = Math.ceil((resetTime - now) / 1000)

        return new Response('Too many requests', {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        })
      }

      // Clean up old entries
      for (const [key] of storage.entries()) {
        const [, storedTime] = storage.get(key)?.split(':').map(Number) ?? []
        if (now - storedTime > WINDOW_SIZE_MS) {
          storage.delete(key)
        }
      }

      return kasadaHandler(req, ev)
    } catch (error) {
      console.error('Rate limit error:', error)
      // In case of error, allow the request
      return kasadaHandler(req, ev)
    }
  }

  return kasadaHandler(req, ev)
}

export const config = {
  matcher: ['/', '/chat/:id*', '/share/:id*']
}
