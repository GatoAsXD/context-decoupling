import { IContextComponent, ILanguageModel } from '../interfaces';
import { Message, Tokens, StrategyInitParameters } from '../schemas';
import { VectorStore } from '../services/vectorStore';

export class PlainMemoryComponent implements IContextComponent {
    private vectorStore: VectorStore;
    initTokens: Tokens = {};

    constructor(llm: ILanguageModel, private memoryLimit: number) {
        this.vectorStore = new VectorStore(llm);
    }
    async init({ plainMemories, tokens }: StrategyInitParameters): Promise<void> {
        this.vectorStore = new VectorStore(this.vectorStore['llm']);
        if (plainMemories.length > 0) {
            for (const mem of plainMemories) {
                await this.vectorStore.addMemory(mem);
            }
            this.initTokens = tokens;
        }
    }

    async getContext(history: Message[], currentQuery: string): Promise<Message[]> {
        const memories = await this.vectorStore.search(currentQuery, this.memoryLimit);

        if (memories.length === 0) return [];

        return [{ role: 'system', content: `Memory Context: ${memories.join('\n')}` }];
    }

    async afterTurn(user: Message, assistant: Message): Promise<Tokens> {
        const tokens = await this.vectorStore.createAndAddMemory(`user: ${user.content} | assistant: ${assistant.content}`);
        return { embeddingTokens: tokens };
    }
}