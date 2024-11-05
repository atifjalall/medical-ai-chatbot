'use client'

import React from 'react'
import { UserMessage, BotMessage } from '@/components/stocks/message'

interface MessageAttachment {
  type: string
  data: string
}

interface MessageComponentProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: MessageAttachment[]
}

export function MessageComponent({ role, content, attachments }: MessageComponentProps) {
  // Check if attachments exist and has content
  const hasImageAttachment = attachments && 
    attachments.length > 0 && 
    attachments[0]?.type === 'image'

  return role === 'assistant' ? (
    <BotMessage content={content} />
  ) : (
    <div>
      <UserMessage>
        <div className="flex flex-col gap-2">
          <div>{content}</div>
          {hasImageAttachment && (
            <div className="relative w-full max-w-[300px] mt-2">
              <img 
                src={attachments[0].data} 
                alt="User uploaded image"
                className="rounded-lg shadow-md w-full h-auto"
              />
            </div>
          )}
        </div>
      </UserMessage>
    </div>
  )
}