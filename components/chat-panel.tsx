import * as React from 'react'

import { shareChat } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { IconShare } from '@/components/ui/icons'
import { FooterText } from '@/components/footer'
import { ChatShareDialog } from '@/components/chat-share-dialog'
import { useAIState, useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
}

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom
}: ChatPanelProps) {
  const [aiState] = useAIState()
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)

  const exampleMessages = [
    {
      heading: 'Evaluate chest pain symptoms',
      subheading: 'Provide potential causes and next steps',
      message:
        'What could be causing chest pain, and when should I seek immediate medical attention?'
    },
    {
      heading: 'Analyze X-ray image',
      subheading: 'Provide observations on a chest X-ray',
      message:
        'Please analyze this chest X-ray and describe any notable findings.'
    },
    {
      heading: 'Evaluate skin rash',
      subheading: 'Provide potential causes and treatments for a skin rash',
      message:
        'What could be causing a skin rash, and what are some common treatments?'
    },
    {
      heading: 'Assess headache symptoms',
      subheading: 'Provide potential causes and treatments for headaches',
      message:
        'What are some common causes of headaches, and how can they be managed?'
    },
    {
      heading: 'Review symptoms of fever',
      subheading: 'Analyze possible causes of a fever',
      message: 'What could be causing a fever, and when should I seek help?'
    },
    {
      heading: 'Analyze stomach pain',
      subheading: 'Provide potential causes of stomach pain',
      message:
        'What could be causing stomach pain, and when should I be concerned?'
    },
    {
      heading: 'Evaluate cough symptoms',
      subheading:
        'Provide possible causes and treatments for a persistent cough',
      message:
        'What are some common causes of a persistent cough, and how can it be treated?'
    },
    {
      heading: 'Review joint pain symptoms',
      subheading: 'Provide possible causes and treatments for joint pain',
      message:
        'What could be causing joint pain, and when should I seek medical attention?'
    },
    {
      heading: 'Assess dizziness symptoms',
      subheading: 'Provide possible causes and next steps for dizziness',
      message:
        'What could be causing dizziness, and when should I see a doctor?'
    },
    {
      heading: 'Analyze breathing difficulties',
      subheading:
        'Provide potential causes and next steps for shortness of breath',
      message:
        'What could be causing shortness of breath, and when should I seek emergency care?'
    }
  ]

  function getRandomQuestions() {
    const shuffled = [...exampleMessages].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 2)
  }

  const randomQuestions = getRandomQuestions()

  return (
    <div className="fixed inset-x-0 bg-white/90 bottom-0 w-full duration-300 ease-in-out peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px] dark:from-10%">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="mb-4 grid sm:grid-cols-2 gap-2 sm:gap-4 px-4 sm:px-0">
          {messages.length === 0 &&
            randomQuestions.map((example, index) => (
              <div
                key={example.heading}
                className={cn(
                  'cursor-pointer bg-zinc-50 text-zinc-950 rounded-2xl p-4 sm:p-6 hover:bg-zinc-100 transition-colors',
                  index > 1 && 'hidden md:block'
                )}
                onClick={async () => {
                  setMessages(currentMessages => [
                    ...currentMessages,
                    {
                      id: nanoid(),
                      display: <UserMessage>{example.message}</UserMessage>
                    }
                  ])

                  try {
                    const responseMessage = await submitUserMessage(
                      example.message
                    )

                    setMessages(currentMessages => [
                      ...currentMessages,
                      responseMessage
                    ])
                  } catch {
                    toast(
                      <div className="text-red-600">
                        You have reached your message limit! Please try again
                        later, or{' '}
                        <a
                          className="underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          href="https://vercel.com/templates/next.js/gemini-ai-chatbot"
                        >
                          deploy your own version
                        </a>
                        .
                      </div>
                    )
                  }
                }}
              >
                <div className="font-medium">{example.heading}</div>
                <div className="text-sm text-zinc-800">
                  {example.subheading}
                </div>
              </div>
            ))}
        </div>

        {messages?.length >= 2 ? (
          <div className="flex h-fit items-center justify-center">
            <div className="flex space-x-2">
              {id && title ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <IconShare className="mr-2" />
                    Share
                  </Button>
                  <ChatShareDialog
                    open={shareDialogOpen}
                    onOpenChange={setShareDialogOpen}
                    onCopy={() => setShareDialogOpen(false)}
                    shareChat={shareChat}
                    chat={{
                      id,
                      title,
                      messages: aiState.messages
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:pb-4">
          <PromptForm input={input} setInput={setInput} />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
