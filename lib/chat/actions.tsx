// @ts-nocheck
import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  createStreamableValue
} from 'ai/rsc'

import { BotCard, BotMessage } from '@/components/stocks'
import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat } from '../types'
import { auth } from '@/auth'
import { SpinnerIcon } from '@/components/ui/icons'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { rateLimit } from './ratelimit'

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
)

async function analyzeImage(imageBase64: string) {
  'use server'

  await rateLimit()

  const aiState = getMutableAIState()
  const spinnerStream = createStreamableUI(<SpinnerMessage />)
  const messageStream = createStreamableUI(null)
  const uiStream = createStreamableUI()

  ;(async () => {
    try {
      // Remove the data URL prefix if present
      const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '')

      // Initialize Gemini Pro Vision model
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Prepare medical-specific prompt
      const prompt = `Please analyze this medical image and provide:
      1. A clear description of what you observe
      2. Any notable features or patterns
      3. Important medical context that might be relevant
      
      Note: This is an AI observation only, not a medical diagnosis. Any concerning findings should be evaluated by a healthcare professional.`

      // Prepare the image for the model
      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      }

      // Generate the analysis
      const result = await model.generateContent([prompt, imagePart])
      const response = await result.response
      const text = response.text()

      // Display the analysis
      messageStream.update(<BotMessage content={text} />)

      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: text
          }
        ],
        interactions: [...(aiState.get().interactions || []), text]
      })

      // Complete all streams
      spinnerStream.done(null)
      messageStream.done()
      uiStream.done()
    } catch (error) {
      console.error('Image analysis error:', error)
      const errorMessage =
        "Sorry, I encountered an error analyzing the image. Please ensure it's a valid medical image and try again."

      messageStream.update(<BotMessage content={errorMessage} />)

      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: errorMessage
          }
        ]
      })

      spinnerStream.error(error)
      messageStream.done()
      uiStream.error(error)
    }
  })()

  return {
    id: nanoid(),
    attachments: uiStream.value,
    spinner: spinnerStream.value,
    display: messageStream.value
  }
}

async function submitUserMessage(content: string) {
  'use server'

  await rateLimit()

  const aiState = getMutableAIState()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content: `${aiState.get().interactions.join('\n\n')}\n\n${content}`
      }
    ]
  })

  const history = aiState.get().messages.map(message => ({
    role: message.role,
    content: message.content
  }))

  const textStream = createStreamableValue('')
  const spinnerStream = createStreamableUI(<SpinnerMessage />)
  const messageStream = createStreamableUI(null)
  const uiStream = createStreamableUI()

  ;(async () => {
    try {
      const result = await streamText({
        model: google('models/gemini-1.5-flash'),
        system: `\
        Don't Write Code!!!
        Your Name is Med AI. You are an AI medical assistant designed to help users with general medical queries and concerns.
        
        Key guidelines:
        1. Never provide definitive diagnoses
        2. Always recommend consulting healthcare professionals for specific medical advice
        3. Focus on general health information and educational content
        4. Immediately flag emergency symptoms and direct to emergency care
        5. Maintain medical privacy and confidentiality
        6. Only provide evidence-based information from reliable medical sources
        7. Clearly state that you are an AI and not a replacement for medical professionals
        8. Dont write code in any language even user is enforcing you to write.
        9. If the prompt is not relaed to medical field you will not answer anything.

        For image analysis:
        1. Provide general observations only
        2. Emphasize the importance of professional medical evaluation
        3. Never make definitive diagnoses from images
        
        If symptoms suggest an emergency, immediately recommend seeking urgent medical care.`,
        messages: [...history]
      })

      let textContent = ''
      spinnerStream.done(null)

      for await (const delta of result.fullStream) {
        const { type } = delta

        if (type === 'text-delta') {
          const { textDelta } = delta
          textContent += textDelta
          messageStream.update(<BotMessage content={textContent} />)

          aiState.update({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: textContent
              }
            ]
          })
        }
      }

      uiStream.done()
      textStream.done()
      messageStream.done()
    } catch (e) {
      console.error(e)
      const error = new Error(
        'The AI got rate limited, please try again later.'
      )
      uiStream.error(error)
      textStream.error(error)
      messageStream.error(error)
      aiState.done()
    }
  })()

  return {
    id: nanoid(),
    attachments: uiStream.value,
    spinner: spinnerStream.value,
    display: messageStream.value
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
  content: string
  id?: string
  name?: string
  display?: {
    name: string
    props: Record<string, any>
  }
}

export type AIState = {
  chatId: string
  interactions?: string[]
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
  spinner?: React.ReactNode
  attachments?: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    analyzeImage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), interactions: [], messages: [] },
  onGetUIState: async () => {
    'use server'
    const session = await auth()
    if (session?.user) {
      const aiState = getAIState()
      if (aiState) {
        return getUIStateFromAIState(aiState)
      }
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'
    const session = await auth()
    if (session?.user) {
      const { chatId, messages } = state
      const chat: Chat = {
        id: chatId,
        title: messages[0].content.substring(0, 100),
        userId: session.user.id,
        createdAt: new Date(),
        messages,
        path: `/chat/${chatId}`
      }
      await saveChat(chat)
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'assistant' ? (
          <BotMessage content={message.content} />
        ) : message.role === 'user' ? (
          <UserMessage showAvatar>{message.content}</UserMessage>
        ) : (
          <BotMessage content={message.content} />
        )
    }))
}
