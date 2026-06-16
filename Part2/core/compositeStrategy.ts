import { IContextComponent } from "./interfaces";
import { AfterTurnError, Message, StrategyInitParameters, Tokens } from "./schemas";

export class CompositeStrategy implements IContextComponent {
    private components: IContextComponent[];

    constructor(...components: IContextComponent[]) {
        this.components = components
    }

    async init(params: StrategyInitParameters) {
        await Promise.all(this.components.map(c => c.init?.(params)));
    }

    async getContext(history: Message[], currentQuery: string): Promise<Message[]> {
        const componentResults = await Promise.all(this.components.map(c => c.getContext(history, currentQuery)));

        const finalContext = componentResults.flat();

        finalContext.push({ role: 'user', content: currentQuery });

        return finalContext;
    }

    async afterTurn(userMessage: Message, assistantResponse: Message): Promise<Tokens | AfterTurnError | undefined> {
        const results = await Promise.all(this.components.map(c => c.afterTurn?.(userMessage, assistantResponse)))
        const errors = results.filter(r => r instanceof AfterTurnError);

        if (errors.length > 0) return new AfterTurnError('AfterTurnError', errors.reduce((acc, curr) => acc += curr.errorCount, 0))

        const successful = results.filter(r => !(r instanceof AfterTurnError)) as (Tokens | undefined)[]

        return successful.reduce((acc, curr) => ({
            inputTokens: (acc?.inputTokens ?? 0) + (curr?.inputTokens ?? 0),
            outputTokens: (acc?.outputTokens ?? 0) + (curr?.outputTokens ?? 0),
            embeddingTokens: (acc?.embeddingTokens ?? 0) + (curr?.embeddingTokens ?? 0)
        }), { inputTokens: 0, outputTokens: 0, embeddingTokens: 0 })
    }
}