'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import clientPromise from '@/lib/mongodb'
import { auth } from '@/auth'
import { type Chat, type Message, type MessageAttachment } from '@/lib/types'

// Helper function to process images within messages
function processImageAttachments(attachments?: MessageAttachment[]): MessageAttachment[] | undefined {
  if (!attachments) return undefined;
  
  return attachments.map(attachment => {
    if (attachment.type === 'image') {
      return {
        type: 'image',
        data: attachment.data,
        mimeType: attachment.mimeType || 'image/jpeg'
      }
    }
    return attachment;
  });
}

// Helper function to process a message with its attachments
function processMessage(msg: Message): Message {
  return {
    ...msg,
    attachments: processImageAttachments(msg.attachments),
    metadata: {
      ...msg.metadata,
      timestamp: msg.metadata?.timestamp || new Date().toISOString()
    }
  }
}

// Helper function to consolidate messages
function consolidateMessages(messages: Message[]): Message[] {
  return messages.reduce((acc: Message[], curr: Message) => {
    const lastMessage = acc[acc.length - 1]
    const hasAttachments = curr.attachments && curr.attachments.length > 0

    const shouldCreateNew =
      !lastMessage ||
      lastMessage.role !== curr.role ||
      curr.metadata?.isEmergencyResponse !==
        lastMessage.metadata?.isEmergencyResponse ||
      curr.id === lastMessage.id ||
      hasAttachments

    const processedMessage = processMessage(curr)

    if (shouldCreateNew) {
      acc.push(processedMessage)
    } else if (curr.content.length > lastMessage.content.length) {
      acc[acc.length - 1] = processedMessage
    }

    return acc
  }, [])
}

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const chats = await db
      .collection<Chat>('chats')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray()

    return chats.map(chat => ({
      ...chat,
      messages: consolidateMessages(chat.messages)
    }))
  } catch (error) {
    console.error('Error fetching chats:', error)
    return []
  }
}

export async function getChat(id: string, userId: string) {
  try {
    const client = await clientPromise
    const db = client.db()

    const chat = await db.collection<Chat>('chats').findOne({
      id,
      userId
    })

    if (!chat || (userId && chat.userId !== userId)) {
      return null
    }

    return {
      ...chat,
      messages: consolidateMessages(chat.messages)
    }
  } catch (error) {
    console.error('Error fetching chat:', error)
    return null
  }
}

export async function saveChat(chat: Chat) {
  const session = await auth()

  if (!session?.user?.id) {
    return
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const existingChat = await db
      .collection<Chat>('chats')
      .findOne({ id: chat.id })

    // Process messages and their attachments
    const processedMessages = chat.messages.map(processMessage)
    const consolidatedMessages = consolidateMessages(processedMessages)

    if (existingChat) {
      const existingMessageIds = new Set(existingChat.messages.map(m => m.id))
      const newMessages = consolidatedMessages.filter(
        msg => !existingMessageIds.has(msg.id)
      )

      if (newMessages.length > 0) {
        await db.collection<Chat>('chats').updateOne(
          { id: chat.id },
          {
            $set: {
              title: chat.title,
              path: chat.path,
              updatedAt: new Date(),
              sharePath: chat.sharePath,
              imageData: chat.imageData
            },
            $push: {
              messages: {
                $each: newMessages
              }
            } as any
          }
        )
      }
    } else {
      await db.collection<Chat>('chats').insertOne({
        ...chat,
        messages: consolidatedMessages,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  } catch (error) {
    console.error('Error saving chat:', error)
  }
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const chat = await db.collection<Chat>('chats').findOne({ id })

    if (!chat || chat.userId !== session.user.id) {
      return {
        error: 'Unauthorized'
      }
    }

    await db.collection('chats').deleteOne({ id })

    revalidatePath('/')
    return revalidatePath(path)
  } catch (error) {
    console.error('Error removing chat:', error)
    return {
      error: 'Failed to remove chat'
    }
  }
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  try {
    const client = await clientPromise
    const db = client.db()

    await db.collection<Chat>('chats').deleteMany({
      userId: session.user.id
    })

    revalidatePath('/')
    return redirect('/')
  } catch (error) {
    console.error('Error clearing chats:', error)
    return {
      error: 'Failed to clear chats'
    }
  }
}

export async function getSharedChat(id: string) {
  try {
    const client = await clientPromise
    const db = client.db()

    const chat = await db.collection<Chat>('chats').findOne({
      id,
      sharePath: { $exists: true }
    })

    if (!chat || !chat.sharePath) {
      return null
    }

    return {
      ...chat,
      messages: consolidateMessages(chat.messages)
    }
  } catch (error) {
    console.error('Error fetching shared chat:', error)
    return null
  }
}

export async function shareChat(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const chat = await db.collection<Chat>('chats').findOne({ id })

    if (!chat || chat.userId !== session.user.id) {
      return {
        error: 'Something went wrong'
      }
    }

    const payload = {
      ...chat,
      sharePath: `/share/${chat.id}`
    }

    await db.collection<Chat>('chats').updateOne({ id }, { $set: payload })

    return payload
  } catch (error) {
    console.error('Error sharing chat:', error)
    return {
      error: 'Failed to share chat'
    }
  }
}

export async function refreshHistory(path: string) {
  redirect(path)
}

export async function getMissingKeys() {
  const keysRequired = ['GOOGLE_GENERATIVE_AI_API_KEY']
  return keysRequired
    .map(key => (process.env[key] ? '' : key))
    .filter(key => key !== '')
}

export async function cleanupExistingChats() {
  try {
    const client = await clientPromise
    const db = client.db()

    const chats = await db.collection<Chat>('chats').find({}).toArray()

    for (const chat of chats) {
      const processedMessages = chat.messages.map(processMessage)
      const consolidatedMessages = consolidateMessages(processedMessages)

      await db.collection<Chat>('chats').updateOne(
        { id: chat.id },
        {
          $set: {
            messages: consolidatedMessages,
            updatedAt: new Date()
          }
        }
      )
    }
    console.log('Existing chats cleaned up successfully')
  } catch (error) {
    console.error('Error cleaning up chats:', error)
  }
}