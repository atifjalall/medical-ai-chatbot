
import { Session } from '@/lib/types'

export interface EmptyScreenProps {
  user?: Session['user'] // Make user optional
}

export function EmptyScreen({ user }: EmptyScreenProps) {
  console.log("EmptyScreen user:", user);
  return (
    <div className="fixed inset-0 flex justify-center items-center">
      <div className="mx-auto max-w-2xl px-4 -mt-32">
        <div className="flex flex-col gap-2 sm:p-8 p-4 text-sm sm:text-base">
          <h1
            className="text-4xl sm:text-5xl tracking-tight font-semibold whitespace-nowrap
                       bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text"
          >
            Hello, {user?.email || 'Guest'}
          </h1>
        </div>
      </div>
    </div>
  )
}
