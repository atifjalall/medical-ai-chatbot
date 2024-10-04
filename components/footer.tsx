import React from 'react'

import { cn } from '@/lib/utils'
import { ExternalLink } from '@/components/external-link'

export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-zinc-500',
        className
      )}
      {...props}
    >
      This is an AI observation only, not a medical diagnosis. Any concerning
      findings should be evaluated by a healthcare professional.
      {/* <ExternalLink href="https://cloud.google.com/vertex-ai">
        Twitter
      </ExternalLink>
      , <ExternalLink href="https://nextjs.org">Next.js</ExternalLink>,{' '}
      <ExternalLink href="https://github.com/vercel/ai">Telegram</ExternalLink>{' '}
      and{' '}
      <ExternalLink href="https://github.com/vercel/ai">Website</ExternalLink>. */}
    </p>
  )
}
