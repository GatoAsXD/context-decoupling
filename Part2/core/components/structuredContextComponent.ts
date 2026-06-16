import { IContextComponent, ILanguageModel } from '../interfaces';
import { Message, Context, StrategyInitParameters, Tokens, AfterTurnError } from '../schemas';

export class StructuredContextComponent implements IContextComponent {
    private context: Context;
    private AIService: ILanguageModel;
    initTokens: Tokens = {};
    constructor(llm: ILanguageModel, private maxContextTokens: number) {
        this.context = { goal: [], constraints: [], decisions: [], entities: [], open: [] };
        this.AIService = llm;
    }

    async init({ structuredContext, tokens }: StrategyInitParameters): Promise<void> {
        this.context = structuredContext;
        this.initTokens = tokens;
    }

    async getContext(history: Message[], currentQuery: string): Promise<Message[]> {
        return [{ role: 'system', content: `Chat Context:\n${this.context}` }];
    }

    async afterTurn(user: Message, assistant: Message): Promise<Tokens | AfterTurnError> {
        const systemPrompt = `
            You are a State Management Engine. Your task is to UPDATE the existing chat context based on the latest conversation turn.

            MERGE LOGIC:
            - Add new items to the existing arrays.
            - Avoid exact duplicates.
            - If the "Last Turn" resolves an item in the "open" list, check it to move it to another category, keep it or remove it.
            - If a "goal" is updated, reflect the change.

            You MUST follow these rules:
            - Do NOT infer or assume information.
            - Do NOT include hypothetical, conditional, or speculative statements.
            - Include past facts only if they are active constraints or relevant information.
            - Do NOT include style, tone, or emotion.
            - Do NOT explain your output.
            - Keep information from the "Previous Context" that is still relevant or active.
            - Each category must be either a string array or an empty array
            - Output MUST be valid JSON. No talk, no markdown blocks, only the JSON object.

            If no valid items exist for a category, output empty array for that category. 
            Your output MUST follow the exact JSON schema provided.
        `;

        const userPrompt = `
            Previous chat context:
            ${this.context}

            Last user message:
            ${user.content}

            Last assistant message:
            ${assistant.content}

            Extract the updated chat context using the schema below.
            {
                "goal": [],
                "constraints": [],
                "decisions": [],
                "entities": [],
                "open": []
            }
        `;
        const response = await this.AIService.response([{ role: 'user', content: userPrompt }], 'medium', systemPrompt, this.maxContextTokens, 0)
            .catch(e => { return new AfterTurnError('AfterTurnError', 1) });

        if (response instanceof AfterTurnError) return response;

        try {
            this.context = JSON.parse(response.content);
            return {
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens
            };
        } catch (e) {
            return new AfterTurnError('AfterTurnError', 1)
        }
    }
}