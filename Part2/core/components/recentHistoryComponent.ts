import { IContextComponent } from '../interfaces';
import { Message } from '../schemas';

export class RecentHistoryComponent implements IContextComponent {
    constructor(private windowSize: number) { }
    
    async getContext(history: Message[], currentQuery: string): Promise<Message[]> {
        return history.slice(-(this.windowSize*2));
    }
}