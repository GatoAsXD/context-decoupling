import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { ILanguageModel } from '../interfaces';
import { Message } from '../schemas';

export interface OpenAIServiceOptions {
    model: string;
    apiVersion: string;
}

export type ReasoningEffort = "low" | "medium" | "high"
export type ModelType = "gpt-5-mini" | "gpt-5-nano"

export class OpenAIService implements ILanguageModel {
    private endpoint: string;
    private credential: DefaultAzureCredential;
    private scope: string;
    private azureADTokenProvider: any;
    private record: Record<string, OpenAIServiceOptions> = {
        'gpt-5-mini': { model: 'gpt-5-mini', apiVersion: '2025-03-01-preview' },
        'gpt-5-nano': { model: 'gpt-5-nano', apiVersion: '2025-03-01-preview' }
    };
    private client: AzureOpenAI;
    private embeddingClient: AzureOpenAI;

    constructor(private readonly model: ModelType, private readonly embeddingModel: string) {

        this.endpoint = "https://rogia-mkotvqd3-eastus2.cognitiveservices.azure.com/";
        this.credential = new DefaultAzureCredential();
        this.scope = "https://cognitiveservices.azure.com/.default";
        this.azureADTokenProvider = getBearerTokenProvider(this.credential, this.scope);
        const options = { endpoint: this.endpoint, azureADTokenProvider: this.azureADTokenProvider, deployment: this.record[this.model].model, apiVersion: this.record[this.model].apiVersion }
        this.client = new AzureOpenAI(options);

        const embeddingOptions = { endpoint: this.endpoint, azureADTokenProvider: this.azureADTokenProvider, deployment: this.embeddingModel, apiVersion: '2024-04-01-preview' }
        this.embeddingClient = new AzureOpenAI(embeddingOptions);
    }

    async response(messages: Message[], effort: ReasoningEffort, systemPrompt?: string, maxOutputTokens?: number, temperature?: number): Promise<{ content: string, inputTokens: number, outputTokens: number }> {
        try {
            const responseConfig: { model: string; reasoning: { effort: ReasoningEffort }; input: Message[], store: boolean, instructions: string | null, max_output_tokens: number | null, temperature: number | null } = {
                model: this.model,
                reasoning: { effort: effort },
                input: messages,
                store: false,
                instructions: systemPrompt || null,
                max_output_tokens: maxOutputTokens || null,
                temperature: temperature || null
            }
            const response = await this.client.responses.create(responseConfig,);

            return {
                content: response.output_text || "",
                inputTokens: response.usage?.input_tokens || 0,
                outputTokens: response.usage?.output_tokens || 0
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getEmbedding(text: string): Promise<{ embedding: number[], tokens: number }> {
        try {
            const response = await this.embeddingClient.embeddings.create({
                model: this.embeddingModel,
                input: text,
            });
            return { embedding: response.data[0].embedding, tokens: response.usage?.total_tokens || 0 };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}