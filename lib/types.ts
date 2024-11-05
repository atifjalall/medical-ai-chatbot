import { Message as AIMessage } from 'ai'
import { Document } from 'mongodb'

// Message attachments (for images)
export interface MessageAttachment {
  type: 'image'
  data: string
  mimeType?: string
  analysisId?: string
}

// Message metadata for tracking and context
export interface MessageMetadata {
  timestamp: string
  isEmergency?: boolean
  isEmergencyResponse?: boolean
  type?: 'image_analysis' | 'image_analysis_response' | 'text'
  relatedToImage?: string
}

// Extended Message type that includes our custom fields
export interface Message extends Omit<AIMessage, 'attachments'> {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: MessageMetadata
  attachments?: MessageAttachment[]
  name?: string
  display?: {
    name: string
    props: Record<string, any>
  }
}

// Chat type for MongoDB storage
export interface Chat extends Document {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: Message[]
  sharePath?: string
  imageData?: string 
  updatedAt: Date
}

// AI State for managing chat state
export interface AIState {
  chatId: string
  interactions?: string[]
  messages: Message[]
  metadata?: {
    lastEmergency?: string
    totalInteractions?: number
    sessionStartTime?: string
  }
}

// UI State for React components
export interface UIState {
  id: string
  display: React.ReactNode
  spinner?: React.ReactNode
  attachments?: React.ReactNode
}

// Server action result type
export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

// Session type for authentication
export interface Session {
  user: {
    id: string
    email: string
  }
}

// Auth result type
export interface AuthResult {
  type: string
  message: string
}

// Tool invocation type for AI actions
export interface ToolInvocation {
  id: string
  type: string
  function: string
  args: Record<string, any>
}

// Complete User interface
export interface User extends Document {
  id: string
  email: string
  password: string
  salt: string
  firstName: string
  lastName: string
  dob: string
  gender: string
}

// Export specific MongoDB types if needed
export type MongoChat = Chat & Document
export type MongoUser = User & Document

// Type for API responses
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Type for chat operations
export interface ChatOperation {
  type: 'create' | 'update' | 'delete'
  chat: Chat
}

// Type for message operations
export interface MessageOperation {
  type: 'add' | 'update' | 'remove'
  message: Message
  chatId: string
}

// Type for file attachments
export interface FileAttachment {
  type: 'file'
  name: string
  size: number
  data: string
  mimeType: string
}

// Combine all attachment types
export type Attachment = MessageAttachment | FileAttachment

// Type for message validation
export interface MessageValidation {
  isValid: boolean
  errors?: string[]
}

// Type for chat validation
export interface ChatValidation {
  isValid: boolean
  errors?: string[]
}

export interface SharedChat {
  id: string
  title: string
  userId: string
  createdAt: Date
  updatedAt: Date
  path: string
  sharePath: string
  messages: {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    metadata?: {
      timestamp: string
    }
    attachments?: Array<{
      type: 'image'
      data: string
      mimeType: string
    }>
  }[]
}

export interface SharedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    timestamp: string
  }
  attachments?: Array<{
    type: 'image'
    data: string
    mimeType: string
  }>
}

export interface SharedChat extends Chat {
  sharePath: string
  messages: SharedMessage[]
}