import { ReasoningEffort } from './services/OpenAIService';
import { Message } from './schemas';

export interface ILanguageModel {
    response(messages: Message[], effort: ReasoningEffort, systemPrompt?: string): Promise<{ content: string, inputTokens: number, outputTokens: number }>
    getEmbedding(text: string): Promise<{ embedding: number[], tokens: number }>;
}

export interface IContextStrategy {
    historyPromptTokens?: number;
    init?(...args: unknown[]): Promise<void>;
    prepareContext(history: Message[], currentQuery: string): Promise<Message[]>;
    getSystemInstructions?(): Promise<string | undefined>;
    afterTurn?(userMessage: Message, assistantResponse: Message): Promise<number | undefined>;
}