import { ReasoningEffort } from './services/OpenAIService';
import { AfterTurnError, Message, StrategyInitParameters, Tokens } from './schemas';

export interface ILanguageModel {
    response(messages: Message[], effort: ReasoningEffort, systemPrompt?: string, maxOutputTokens?: number, temperature?: number): Promise<{ content: string, inputTokens: number, outputTokens: number }>
    getEmbedding(text: string): Promise<{ embedding: number[], tokens: number }>;
}

export interface IContextComponent {
    initTokens?: Tokens;
    init?(initParameters: StrategyInitParameters): Promise<void>;
    getContext(history: Message[], currentQuery: string): Promise<Message[]>;
    afterTurn?(userMessage: Message, assistantResponse: Message): Promise<Tokens | AfterTurnError | undefined>;
}