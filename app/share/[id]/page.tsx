import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { getSharedChat } from '@/app/actions'
import { ChatList } from '@/components/chat-list'
import { FooterText } from '@/components/footer'
import { AI } from '@/lib/chat/actions'
import { MessageComponent } from '@/components/client-message'

interface SharePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: SharePageProps): Promise<Metadata> {
  const chat = await getSharedChat(params.id)

  return {
    title: chat?.title.slice(0, 50) ?? 'Shared Chat'
  }
}

function getUIStateFromMessages(chat: any) {
  return chat.messages.map((message: any, index: number) => ({
    id: `${chat.id}-${index}`,
    display: (
      <MessageComponent 
        role={message.role}
        content={message.content}
        attachments={message.attachments}
      />
    )
  }))
}

export default async function SharePage({ params }: SharePageProps) {
  const chat = await getSharedChat(params.id)

  if (!chat || !chat?.sharePath) {
    notFound()
  }

  const uiState = getUIStateFromMessages(chat)

  return (
    <>
      <div className="flex-1 space-y-6">
        <div className="border-b bg-background px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto max-w-2xl">
            <div className="space-y-1 md:-mx-8">
              <h1 className="text-2xl font-bold">{chat.title}</h1>
              <div className="text-sm text-muted-foreground">
                {formatDate(chat.createdAt)} · {chat.messages.length} messages
              </div>
            </div>
          </div>
        </div>
        <AI initialAIState={{ 
          chatId: chat.id,
          messages: chat.messages,
          interactions: []
        }}>
          <ChatList messages={uiState} isShared={true} />
        </AI>
      </div>
      <FooterText className="py-8" />
    </>
  )
}