import { IContextStrategy } from '../interfaces';
import { Message } from '../schemas';

export class SlidingWindowStrategy implements IContextStrategy {
    constructor(private windowSize: number) { }
    async prepareContext(history: Message[], currentQuery: string): Promise<Message[]> {
        const full: Message[] = [...history, { role: 'user', content: currentQuery }];
        return full.slice(-(this.windowSize*2+1));
    }
}