// lib/stores/contextStore.ts

type ConversationContext = {
  currentTopic?: string
  lastMessageId?: string
  relatedMessages: string[]
  timestamp: Date
}

class ContextStore {
  private static instance: ContextStore
  private contexts: Map<string, ConversationContext> = new Map()

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new ContextStore()
    }
    return this.instance
  }

  setContext(chatId: string, context: ConversationContext) {
    this.contexts.set(chatId, {
      ...context,
      timestamp: new Date()
    })
  }

  getContext(chatId: string): ConversationContext | undefined {
    return this.contexts.get(chatId)
  }

  updateContext(chatId: string, updates: Partial<ConversationContext>) {
    const existing = this.contexts.get(chatId)
    if (existing) {
      this.contexts.set(chatId, {
        ...existing,
        ...updates,
        timestamp: new Date()
      })
    }
  }

  clearContext(chatId: string) {
    this.contexts.delete(chatId)
  }
}

export const contextStore = ContextStore.getInstance()
