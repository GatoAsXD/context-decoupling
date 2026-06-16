import { checkIfHistoryHasMemory, generateMemories, getHistoriesByScriptLength } from '../helpers';
import { OpenAIService } from '../core/services/OpenAIService';

const openAIService = new OpenAIService('gpt-5-mini', 'text-embedding-3-small');

const scriptLength = 40
const allHistories = getHistoriesByScriptLength('cs_v1_EARLY', scriptLength);
const histories = allHistories.filter(historyId => !checkIfHistoryHasMemory(historyId));

async function processHistories() {
    for (const historyId of histories) {
        await generateMemories(historyId, openAIService);
    }
}

processHistories().catch(err => {
    console.error('Error during memories generation:', err);
});