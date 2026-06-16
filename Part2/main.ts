import { ExperimentRunner } from './core/runner';
import { ModelType, OpenAIService } from './core/services/OpenAIService';
import { RecentHistoryComponent } from './core/components/recentHistoryComponent';
import { PlainContextComponent } from './core/components/plainContextComponent';
import { StructuredContextComponent } from './core/components/structuredContextComponent';
import { PlainMemoryComponent } from './core/components/plainMemoryComponent';
import { SummarizedMemoryStrategy } from './core/components/summarizedMemoryStrategy';
import { getContextForScript, getExperimentalScriptForScript, getHistoryForScript, getMemoryForScript, getRandomScripts, getScriptById } from './helpers';
import { CompositeStrategy } from './core/compositeStrategy';
import { Context, StrategyInitParameters } from './core/schemas';

const openAIService = new OpenAIService('gpt-5-mini', 'text-embedding-3-small');
const openAISystemService = new OpenAIService('gpt-5-nano', 'text-embedding-3-small');
const runner = new ExperimentRunner(openAIService);

const scriptsv1 = getRandomScripts('cs_v1_EARLY', 4);
const scriptsv2 = getRandomScripts('cs_v2_OVERRIDE', 4);
const scriptsv3 = getRandomScripts('cs_v3_ACCUMULATION', 4);
const scriptsv4 = getRandomScripts('cs_v4_NOISE', 4);

const scripts = [...scriptsv1, ...scriptsv2, ...scriptsv3, ...scriptsv4]

const scriptsData = scripts.map(script => getScriptById(script))
const historiesData = scripts.map(script => getHistoryForScript(script));
const experimentalScripts = scripts.map(script => getExperimentalScriptForScript(script).messages);

const plainMemories = scripts.map(script => getMemoryForScript(script, 'plainMemory'));
const summarizedMemories = scripts.map(script => getMemoryForScript(script, 'summarizedMemory'));
const plainContexts = scripts.map(script => getContextForScript(script, 'plainContext'));
const structuredContexts = scripts.map(script => getContextForScript(script, 'structuredContext'));

const initParams: StrategyInitParameters[] = scripts.map((script, i) => ({
    tokens: {
        inputTokens: (summarizedMemories[i].generationMetrics.inputTokens ?? 0) + (plainContexts[i].generationMetrics.inputTokens ?? 0) + (structuredContexts[i].generationMetrics.inputTokens ?? 0),
        outputTokens: (summarizedMemories[i].generationMetrics.outputTokens ?? 0) + (plainContexts[i].generationMetrics.outputTokens ?? 0) + (structuredContexts[i].generationMetrics.outputTokens ?? 0),
        totalTokens: 
            (summarizedMemories[i].generationMetrics.inputTokens ?? 0) + (plainContexts[i].generationMetrics.inputTokens ?? 0) + (structuredContexts[i].generationMetrics.inputTokens ?? 0) + 
            (summarizedMemories[i].generationMetrics.outputTokens ?? 0) + (plainContexts[i].generationMetrics.outputTokens ?? 0) + (structuredContexts[i].generationMetrics.outputTokens ?? 0),
        embeddingTokens: (plainMemories[i].generationMetrics.embeddingTokens ?? 0) + (summarizedMemories[i].generationMetrics.inputTokens ?? 0)
    },
    plainMemories: plainMemories[i].memories,
    summarizedMemories: summarizedMemories[i].memories,
    plainContext: plainContexts[i].context as string,
    structuredContext: structuredContexts[i].context as Context
}));

const model: ModelType = 'gpt-5-mini';
const runCountPerCondition = 4;

const RecentHistory = new RecentHistoryComponent(5);
const PlainContext = new PlainContextComponent(openAISystemService, 3500);
const StructuredContext = new StructuredContextComponent(openAISystemService, 5000);
const PlainMemory = new PlainMemoryComponent(openAISystemService, 4)
const SummarizedMemory = new SummarizedMemoryStrategy(openAISystemService, 4, 1200) 

const configurations = [
    { name: 'S1_HistoryOnly', factory: () => new CompositeStrategy(RecentHistory), runs: runCountPerCondition },
    { name: 'S2_HistoryStructuredContext', factory: () => new CompositeStrategy(RecentHistory, StructuredContext), runs: runCountPerCondition },
    { name: 'S3_HistoryPlainContext', factory: () => new CompositeStrategy(RecentHistory, PlainContext), runs: runCountPerCondition },
    { name: 'S4_HistoryPlainMemory', factory: () => new CompositeStrategy(RecentHistory, PlainMemory), runs: runCountPerCondition },
    { name: 'S5_HistorySummarizedMemory', factory: () => new CompositeStrategy(RecentHistory, SummarizedMemory), runs: runCountPerCondition },
    { name: 'S6_HistoryStructuredContextPlainMemory', factory: () => new CompositeStrategy(RecentHistory, StructuredContext, PlainMemory), runs: runCountPerCondition },
    { name: 'S7_HistoryStructuredContextSummarizedMemory', factory: () => new CompositeStrategy(RecentHistory, StructuredContext, SummarizedMemory), runs: runCountPerCondition },
    { name: 'S8_HistoryPlainContextPlainMemory', factory: () => new CompositeStrategy(RecentHistory, PlainContext, PlainMemory), runs: runCountPerCondition },
    { name: 'S9_HistoryPlainContextSummarizedMemory', factory: () => new CompositeStrategy(RecentHistory, PlainContext, SummarizedMemory), runs: runCountPerCondition },
    { name: 'S10_FullComposite', factory: () => new CompositeStrategy(RecentHistory, StructuredContext, PlainContext, SummarizedMemory), runs: runCountPerCondition }
];

runner.runExperimentSuite(
    'Experiment 2',
    configurations,
    model,
    'medium',
    scriptsData.map(data => ({id: data.id, type: data.type, entries: data.messages})),
    historiesData.map(data => ({id: data.id, scriptId: data.scriptId, cutoffIndex: data.cutoffIndex, messages: data.messages})),
    experimentalScripts,
    initParams,
    'text-embedding-3-small'
).catch(err => {
    console.error('Error during experiment suite:', err);
});