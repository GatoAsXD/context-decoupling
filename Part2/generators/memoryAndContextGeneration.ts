import { checkIfHistoryHasContext, checkIfHistoryHasMemory, generatePlainContext, generatePlainMemories, generateStructuredContext, generateSummarizedMemories, getHistoriesByScriptLength, sleep } from '../helpers';
import { OpenAIService } from '../core/services/OpenAIService';

const openAIService = new OpenAIService('gpt-5-nano', 'text-embedding-3-small');

const scriptLength = 40
const allHistories = [
    ...getHistoriesByScriptLength('cs_v1_EARLY', scriptLength),
    ...getHistoriesByScriptLength('cs_v2_OVERRIDE', scriptLength),
    ...getHistoriesByScriptLength('cs_v3_ACCUMULATION', scriptLength),
    ...getHistoriesByScriptLength('cs_v4_NOISE', scriptLength)
];
const histories = allHistories.filter(historyId =>
    !checkIfHistoryHasMemory(historyId, 'plainMemory') &&
    !checkIfHistoryHasMemory(historyId, 'summarizedMemory') &&
    !checkIfHistoryHasContext(historyId, 'plainContext') &&
    !checkIfHistoryHasContext(historyId, 'structuredContext')
);
console.log(histories.length)
async function processHistories() {
    for (let i = 0; i < histories.length; i += 5) {
        const historyId1 = histories[i]
        const historyId2 = histories[i + 1]
        const historyId3 = histories[i + 2]
        const historyId4 = histories[i + 3]
        const historyId5 = histories[i + 4]
        console.log(historyId1)
        console.log(historyId2)
        console.log(historyId3)
        console.log(historyId4)
        console.log(historyId5)
        
        await Promise.all([
            generatePlainMemories(historyId1, openAIService),
            generateSummarizedMemories(historyId1, openAIService),
            generatePlainContext(historyId1, openAIService),
            generateStructuredContext(historyId1, openAIService),
            generatePlainMemories(historyId2, openAIService),
            generateSummarizedMemories(historyId2, openAIService),
            generatePlainContext(historyId2, openAIService),
            generateStructuredContext(historyId2, openAIService),
            generatePlainMemories(historyId3, openAIService),
            generateSummarizedMemories(historyId3, openAIService),
            generatePlainContext(historyId3, openAIService),
            generateStructuredContext(historyId3, openAIService),
            generatePlainMemories(historyId4, openAIService),
            generateSummarizedMemories(historyId4, openAIService),
            generatePlainContext(historyId4, openAIService),
            generateStructuredContext(historyId4, openAIService),
            generatePlainMemories(historyId5, openAIService),
            generateSummarizedMemories(historyId5, openAIService),
            generatePlainContext(historyId5, openAIService),
            generateStructuredContext(historyId5, openAIService)
        ]);

    }
}

processHistories().catch(err => {
    console.error('Error during memories generation:', err);
});
