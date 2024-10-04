import { ExternalLink } from '@/components/external-link'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-zinc-50 sm:p-8 p-4 text-sm sm:text-base">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-semibold max-w-fit inline-block">
          Medical AI
        </h1>
        <p className="leading-normal text-zinc-900">
          Our AI provides medical advice through text and image analysis,
          helping you understand symptoms and conditions. While it offers
          valuable insights, it's not a substitute for professional healthcare.
          Always seek medical attention if symptoms persist or in case of
          serious conditions.
        </p>
      </div>
    </div>
  )
}
