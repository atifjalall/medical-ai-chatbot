// app/api/[...route]/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

async function handler(request: Request) {
  try {
    const url = new URL(request.url)
    
    // Ensure the URL is properly formatted
    if (!process.env.API_ENDPOINT) {
      throw new Error('API_ENDPOINT is not defined')
    }

    // Configure the forwarding URL
    url.protocol = 'https:'
    url.host = process.env.API_ENDPOINT
    url.port = ''

    // Prepare headers
    const headers = new Headers(request.headers)
    
    // Remove problematic headers that might cause issues
    headers.delete('host')
    headers.delete('connection')
    headers.delete('keep-alive')
    
    // Add any required headers
    if (process.env.API_KEY) {
      headers.set('Authorization', `Bearer ${process.env.API_KEY}`)
    }

    const response = await fetch(url.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      // Remove duplex option as it's not needed and can cause issues
      redirect: 'follow'
    })

    // Create a new response with the received data
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler