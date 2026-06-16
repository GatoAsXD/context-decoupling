import { ILanguageModel } from '../interfaces';

export interface MemoryItem {
    id: string;
    content: string;
    embedding: number[];
}

export class VectorStore {
    private memories: MemoryItem[] = [];

    constructor(private llm: ILanguageModel) { }

    async createAndAddMemory(content: string): Promise<number> {
        const embedding = await this.createMemory(content);
        this.addMemory(embedding.memory);
        return embedding.tokens;
    }

    async createMemory(content: string): Promise<{ tokens: number, memory: MemoryItem }> {
        const embedding = await this.llm.getEmbedding(content);
        const memory = {
            id: Date.now().toString() + Math.random().toString(),
            content,
            embedding: embedding.embedding
        };
        return { tokens: embedding.tokens, memory };
    }

    async addMemory(memory: MemoryItem) {
        this.memories.push(memory);
    }

    async search(query: string, topK: number = 3): Promise<string[]> {
        if (this.memories.length === 0) return [];

        const queryEmbedding = await this.llm.getEmbedding(query);

        // Calcular similitud de coseno
        const scored = this.memories.map(mem => {
            const similarity = this.cosineSimilarity(queryEmbedding.embedding, mem.embedding);
            return { content: mem.content, similarity };
        });

        // Ordenar descendente y cortar
        return scored
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
            .map(item => item.content);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        // Asumiendo vectores normalizados, el coseno es el producto punto
        return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    }
}