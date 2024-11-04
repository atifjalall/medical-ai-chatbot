// app/waiting-room/page.tsx
import { Button } from '@/components/ui/button'

export default function WaitingRoom() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Rate Limit Exceeded
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait a moment before making more requests.
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <Button
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}