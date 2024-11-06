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
import { contextStore } from '@/lib/stores/contextStore';
import { ConversationAnalyzer } from '@/lib/utils/conversationAnalyzer';
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
      const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      
      // Get the last user message as the question
      const previousMessages = aiState.get().messages
      const lastUserMessage = previousMessages
        .slice()
        .reverse()
        .find(msg => msg.role === 'user')

      const userImageMessage = {
        id: nanoid(),
        role: 'user',
        content: lastUserMessage?.content || 'Please analyze this medical image',
        attachments: [{
          type: 'image',
          data: imageBase64,
          mimeType: 'image/jpeg'
        }],
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'image_analysis',
          isImageAttachment: true
        }
      }

      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          userImageMessage
        ],
        interactions: [
          ...(aiState.get().interactions || []),
          userImageMessage.content
        ]
      })

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Enhanced medical analysis prompt
      const prompt = `Please provide a comprehensive medical analysis of this image using the following structure:

      1. IDENTIFICATION
      - What does the image show? (Be specific about the medical condition/finding)
      - Location/area affected
      - Visual characteristics (color, size, shape, texture)

      2. POTENTIAL CONDITION
      - What might this represent? (List possible conditions)
      - Typical characteristics of this type of condition
      - Common stages or progression if applicable
      - Severity indicators visible in the image

      3. GENERAL MANAGEMENT APPROACHES
      - Common treatment methods for this type of condition
      - Lifestyle modifications that might help
      - Preventive measures
      - Follow-up care considerations

      4. IMPORTANT MEDICAL DISCLAIMERS
      ⚠️ MEDICAL DISCLAIMER:
      - This is an AI analysis only, NOT a diagnosis
      - This analysis is for informational purposes only
      - Any medical condition requires proper evaluation by a healthcare professional
      - If you're experiencing concerning symptoms, seek immediate medical attention
      - Only a qualified healthcare provider can provide accurate diagnosis and treatment
      - Medical decisions should not be made based on this AI analysis

      Please provide the analysis in a clear, organized format following these sections.`

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      }

      const result = await model.generateContent([prompt, imagePart])
      const response = await result.response
      const text = response.text()

      messageStream.update(<BotMessage content={text} />)

      const assistantMessage = {
        id: nanoid(),
        role: 'assistant',
        content: text,
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'image_analysis_response',
          relatedToImage: userImageMessage.id,
          isComprehensiveAnalysis: true
        }
      }

      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          assistantMessage
        ],
        interactions: [
          ...(aiState.get().interactions || []),
          text
        ]
      })

      spinnerStream.done(null)
      messageStream.done()
      uiStream.done()
    } catch (error) {
      console.error('Image analysis error:', error)
      const errorMessage = "I apologize, but I encountered an error analyzing the image. Please ensure it's a clear medical image and try again. For accurate medical evaluation, please consult a healthcare professional."

      messageStream.update(<BotMessage content={errorMessage} />)

      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: errorMessage,
            metadata: {
              timestamp: new Date().toISOString(),
              type: 'error'
            }
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
  const chatId = aiState.get().chatId
  
  // Get current context
  let currentContext = contextStore.getContext(chatId);
  
  // Analyze the message
  const isFollowUp = ConversationAnalyzer.isFollowUpQuestion(content, aiState.get().messages);
  
  // Update context if needed
  if (ConversationAnalyzer.shouldUpdateContext(content, currentContext)) {
    const newTopic = content;
    currentContext = {
      currentTopic: newTopic,
      lastMessageId: nanoid(),
      relatedMessages: [],
      timestamp: new Date()
    };
    contextStore.setContext(chatId, currentContext);
  }

  // Create user message
  const userMessage = {
    id: nanoid(),
    role: 'user',
    content,
    metadata: {
      timestamp: new Date().toISOString(),
      contextId: currentContext?.lastMessageId,
      isFollowUp,
      topic: currentContext?.currentTopic
    }
  };

  // Update state
  aiState.update({
    ...aiState.get(),
    messages: [...aiState.get().messages, userMessage]
  });

  const textStream = createStreamableValue('')
  const spinnerStream = createStreamableUI(<SpinnerMessage />)
  const messageStream = createStreamableUI(null)
  const uiStream = createStreamableUI()

  ;(async () => {
    try {
      const systemPrompt = ConversationAnalyzer.buildSystemPrompt(content, currentContext);
      
      const result = await streamText({
        model: google('models/gemini-1.5-flash'),
        system: systemPrompt,
        messages: [
          ...(currentContext?.currentTopic ? [{
            role: 'system',
            content: `The current topic is: ${currentContext.currentTopic}`
          }] : []),
          ...aiState.get().messages.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ]
      });

      let textContent = ''
      spinnerStream.done(null)

      for await (const delta of result.fullStream) {
        if (delta.type === 'text-delta') {
          textContent += delta.textDelta
          messageStream.update(<BotMessage content={textContent} />)

          const assistantMessage = {
            id: nanoid(),
            role: 'assistant',
            content: textContent,
            metadata: {
              timestamp: new Date().toISOString(),
              contextId: currentContext?.lastMessageId,
              topic: currentContext?.currentTopic,
              isFollowUp
            }
          }

          aiState.update({
            ...aiState.get(),
            messages: [...aiState.get().messages, assistantMessage]
          })
        }
      }

      uiStream.done()
      textStream.done()
      messageStream.done()
    } catch (e) {
      console.error(e)
      handleError(e, uiStream, textStream, messageStream, aiState)
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
  initialAIState: { 
    chatId: nanoid(), 
    interactions: [], 
    messages: [] 
  },
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
        title: messages[0]?.content.substring(0, 100) || 'New Chat',
        userId: session.user.id,
        createdAt: new Date(),
        messages: messages.map(msg => ({
          ...msg,
          metadata: {
            ...msg.metadata,
            timestamp: msg.metadata?.timestamp || new Date().toISOString()
          }
        })),
        path: `/chat/${chatId}`,
        updatedAt: new Date()
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
      display: message.role === 'assistant' ? (
        <BotMessage content={message.content} />
      ) : message.role === 'user' ? (
        <div>
          <UserMessage showAvatar>
            <div className="flex flex-col gap-2">
              <div>{message.content}</div>
              {message.attachments?.length > 0 && message.attachments[0].type === 'image' && (
                <div className="relative w-full max-w-[200px] mt-2"> 
                  <img 
                    src={message.attachments[0].data} 
                    alt="User uploaded image"
                    className="rounded-lg shadow-md w-full h-auto"
                  />
                </div>
              )}
            </div>
          </UserMessage>
        </div>
      ) : (
        <BotMessage content={message.content} />
      )
    }))
}