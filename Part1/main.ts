import { ExperimentRunner } from './core/experimentRunner';
import { ModelType, OpenAIService } from './core/services/OpenAIService';
import { FullHistoryStrategy } from './core/strategies/fullHistoryStrategy';
import { SlidingWindowStrategy } from './core/strategies/slidingWindowStrategy';
import { MemoryBasedStrategy } from './core/strategies/memoryBasedStrategy';
import { getExperimentScriptForScript, getHistoryForScript, getMemoryForScript, getRandomScripts } from './helpers';

const openAIService = new OpenAIService('gpt-5-mini', 'text-embedding-3-small');
const runner = new ExperimentRunner(openAIService);

const scripts = getRandomScripts('cs_v1_EARLY', 25);
const historiesData = scripts.map(script => getHistoryForScript(script));
const histories = historiesData.map(history => history.messages);
const historiesMetadata = historiesData.map(history => history.metadata);
const experimentScripts = scripts.map(script => getExperimentScriptForScript(script).messages);
const memories = scripts.map(script => getMemoryForScript(script).memories);
const memoriesTokens = scripts.map(script => getMemoryForScript(script).metadata.embeddingTokens);

const model: ModelType = 'gpt-5-mini';
const runCountPerCondition = 5;
const configurations = [
    { name: 'A_FullHistory', factory: () => new FullHistoryStrategy(), runs: runCountPerCondition },
    { name: 'B_SlidingWindow', factory: () => new SlidingWindowStrategy(6), runs: runCountPerCondition },
    { name: 'C_MemoryBased', factory: () => new MemoryBasedStrategy(openAIService, 3, 4), runs: runCountPerCondition }
];

runner.runExperimentSuite('Experiment 1 - cs_v1_EARLY - Recall under distraction', configurations, model, 'medium', histories, experimentScripts, memories, memoriesTokens, historiesMetadata, 'text-embedding-3-small').catch(err => {
    console.error('Error during experiment suite:', err);
});
