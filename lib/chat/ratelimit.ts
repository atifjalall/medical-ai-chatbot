import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import clientPromise from '@/lib/mongodb'

const RATE_LIMIT = 60 // requests per minute
const WINDOW_SIZE = 60 * 1000 // 1 minute in milliseconds

function getIP() {
  const forwardedFor = headers().get('x-forwarded-for')
  const realIP = headers().get('x-real-ip')
  return (forwardedFor?.split(',')[0] ?? realIP ?? 'unknown').trim()
}

interface RateLimitDoc {
  ip: string
  requests: number
  windowStart: Date
  updatedAt: Date
}

export async function rateLimit() {
  const identifier = getIP()
  const now = new Date()

  try {
    const client = await clientPromise
    const db = client.db()
    const rateLimits = db.collection<RateLimitDoc>('rateLimits')

    // Create index if it doesn't exist
    await rateLimits.createIndex({ ip: 1 })
    await rateLimits.createIndex({ windowStart: 1 }, { expireAfterSeconds: 60 })

    // Get or create rate limit document
    const rateLimitDoc = await rateLimits.findOne({ ip: identifier })

    if (!rateLimitDoc) {
      // First request for this IP
      await rateLimits.insertOne({
        ip: identifier,
        requests: 1,
        windowStart: now,
        updatedAt: now
      })
      return true
    }

    // Check if window has expired
    const windowExpired = now.getTime() - rateLimitDoc.windowStart.getTime() > WINDOW_SIZE

    if (windowExpired) {
      // Reset window
      await rateLimits.updateOne(
        { ip: identifier },
        {
          $set: {
            requests: 1,
            windowStart: now,
            updatedAt: now
          }
        }
      )
      return true
    }

    // Check if rate limit exceeded
    if (rateLimitDoc.requests >= RATE_LIMIT) {
      const resetTime = new Date(rateLimitDoc.windowStart.getTime() + WINDOW_SIZE)
      return redirect('/api/limit-exceeded')
    }

    // Increment request count
    await rateLimits.updateOne(
      { ip: identifier },
      {
        $inc: { requests: 1 },
        $set: { updatedAt: now }
      }
    )

    return true
  } catch (error) {
    console.error('Rate limit error:', error)
    // Allow request on error
    return true
  }
}

export async function getRateLimitInfo(ip?: string) {
  const identifier = ip || getIP()

  try {
    const client = await clientPromise
    const db = client.db()
    const rateLimits = db.collection<RateLimitDoc>('rateLimits')

    const rateLimitDoc = await rateLimits.findOne({ ip: identifier })

    if (!rateLimitDoc) {
      return {
        remaining: RATE_LIMIT,
        reset: new Date(Date.now() + WINDOW_SIZE),
        limit: RATE_LIMIT,
        current: 0
      }
    }

    const now = new Date()
    const windowExpired = now.getTime() - rateLimitDoc.windowStart.getTime() > WINDOW_SIZE

    if (windowExpired) {
      return {
        remaining: RATE_LIMIT,
        reset: new Date(now.getTime() + WINDOW_SIZE),
        limit: RATE_LIMIT,
        current: 0
      }
    }

    return {
      remaining: Math.max(0, RATE_LIMIT - rateLimitDoc.requests),
      reset: new Date(rateLimitDoc.windowStart.getTime() + WINDOW_SIZE),
      limit: RATE_LIMIT,
      current: rateLimitDoc.requests
    }
  } catch (error) {
    console.error('Error getting rate limit info:', error)
    return {
      remaining: RATE_LIMIT,
      reset: new Date(Date.now() + WINDOW_SIZE),
      limit: RATE_LIMIT,
      current: 0
    }
  }
}