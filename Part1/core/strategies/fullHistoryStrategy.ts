import { IContextStrategy } from '../interfaces';
import { Message } from '../schemas';

export class FullHistoryStrategy implements IContextStrategy {
    async prepareContext(history: Message[], currentQuery: string): Promise<Message[]> {
        return [...history, { role: 'user', content: currentQuery }];
    }
}