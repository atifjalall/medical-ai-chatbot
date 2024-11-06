// lib/utils/conversationAnalyzer.ts

import { Message } from '@/lib/types';

export class ConversationAnalyzer {
  static hasPronouns(text: string): boolean {
    const pronouns = ['it', 'this', 'that', 'these', 'those', 'they', 'them'];
    return pronouns.some(pronoun => new RegExp(`\\b${pronoun}\\b`, 'i').test(text));
  }

  static findMainTopic(messages: Message[]): string | undefined {
    const recentMessages = messages.slice(-5).reverse();
    
    for (const msg of recentMessages) {
      if (msg.role === 'user' && !this.hasPronouns(msg.content)) {
        return msg.content;
      }
    }
    
    return undefined;
  }

  static isFollowUpQuestion(currentMessage: string, previousMessages: Message[]): boolean {
    if (!this.hasPronouns(currentMessage)) {
      return false;
    }

    const mainTopic = this.findMainTopic(previousMessages);
    return !!mainTopic;
  }

  static buildSystemPrompt(currentMessage: string, context: any): string {
    let prompt = `You are Med AI, an AI medical assistant designed to help users with general medical queries and concerns.

Instructions:
1. ALWAYS maintain conversation context
2. EXPLICITLY reference the topic being discussed
3. If using pronouns, clearly state what they refer to
4. Never provide definitive diagnoses
5. Always recommend consulting healthcare professionals
`;

    if (context?.currentTopic) {
      prompt += `\nCurrent Topic: "${context.currentTopic}"
Previous Discussion: This conversation is about ${context.currentTopic}.
Current Query: This appears to be a follow-up question about ${context.currentTopic}.

When responding:
- Explicitly mention that you are talking about ${context.currentTopic}
- Connect your response to the previous discussion about ${context.currentTopic}
- Make sure to maintain continuity with the earlier conversation
`;
    }

    return prompt;
  }

  static shouldUpdateContext(newMessage: string, currentContext?: any): boolean {
    return !this.hasPronouns(newMessage) || !currentContext;
  }
}