import { IContextStrategy, ILanguageModel } from '../interfaces';
import { Message } from '../schemas';
import { MemoryItem, VectorStore } from '../memory/vectorStore';

export class MemoryBasedStrategy implements IContextStrategy {
    private vectorStore: VectorStore;
    historyPromptTokens: number = 0;
    constructor(llm: ILanguageModel, private memoryLimit: number, private recentLimit: number) {
        this.vectorStore = new VectorStore(llm);
    }
    async init(historyPromptMemories: MemoryItem[] = [], historyEmbeddingTokens: number): Promise<void> {
        this.vectorStore = new VectorStore(this.vectorStore['llm']);
        if (historyPromptMemories.length > 0) {
            for (const mem of historyPromptMemories) {
                await this.vectorStore.addMemory(mem);
            }
            this.historyPromptTokens = historyEmbeddingTokens;
        }
    }
    async prepareContext(history: Message[], currentQuery: string): Promise<Message[]> {
        const memories = await this.vectorStore.search(currentQuery, this.memoryLimit);
        const contextBlock = memories.length > 0
            ? `Relevant Facts:\n${memories.join('\n')}`
            : '';

        return [
            { role: 'system', content: `Memory context: ${contextBlock}` },
            ...history.slice(-this.recentLimit),
            { role: 'user', content: currentQuery }
        ];
    }
    async afterTurn(user: Message, assistant: Message): Promise<number | undefined> {
        const tokens = await this.vectorStore.createAndAddMemory(`user: ${user.content} | assistant: ${assistant.content}`);
        return tokens;
    }
}