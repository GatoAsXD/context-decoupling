import * as fs from 'fs';
import { IContextStrategy, ILanguageModel } from './interfaces';
import { ExperimentResult, Message, SuiteResult } from './schemas';
import { EpisodeResult, TurnRecord } from './schemas';
import { ModelType, ReasoningEffort } from './services/OpenAIService';
import { MemoryItem } from './memory/vectorStore';
import { computeHash, normalizeScript, normalizeHistory, sleep } from '../helpers';

export class ExperimentRunner {
    private record: Record<ModelType, { input: number, output: number }> = {
        'gpt-5': { input: 1.25, output: 10 },
        'gpt-5.1': { input: 1.25, output: 10 },
        'gpt-5.2': { input: 1.75, output: 14 },
        'gpt-5-mini': { input: 0.25, output: 2 },
        'gpt-5-nano': { input: 0.05, output: 0.4 }
    };

    constructor(private openAIService: ILanguageModel) { }

    async executeEpisode(
        condition: string,
        runIndex: number,
        strategy: IContextStrategy,
        model: ModelType,
        effort: ReasoningEffort,
        historyPrompt: Message[] = [],
        script: string[],
        historyPromptMemories: MemoryItem[] = [],
        memoriesTokens: number = 0
    ): Promise<EpisodeResult> {
        const startTime = Date.now();
        const turns: TurnRecord[] = [];
        const PRICE_INPUT = this.record[model].input / 1000000;
        const PRICE_OUTPUT = this.record[model].output / 1000000;
        const history: Message[] = [...historyPrompt];

        await strategy.init?.(historyPromptMemories, memoriesTokens);

        for (let i = 0; i < script.length; i++) {
            const turnStartTime = Date.now();
            const currentInput = script[i];
            const prompt = await strategy.prepareContext(history, currentInput);
            const systemInstructions = await strategy.getSystemInstructions?.();

            const response = await this.openAIService.response(prompt, effort, systemInstructions);

            const userMsg: Message = { role: 'user', content: currentInput };
            const assistantMsg: Message = { role: 'assistant', content: response.content };
            history.push(userMsg, assistantMsg);
            const embeddingTokens = await strategy.afterTurn?.(userMsg, assistantMsg);
            const turnEndTime = Date.now();
            const executionTimeMs = turnEndTime - turnStartTime;

            const turnRecord: TurnRecord = {
                turnIndex: i + 1,
                promptSent: prompt,
                modelResponse: response.content,
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens,
                executionTimeMs: executionTimeMs,
                embeddingTokens: embeddingTokens || 0
            };

            turns.push(turnRecord);
        }

        const totalIn = turns.reduce((sum, t) => sum + t.inputTokens, 0);
        const totalOut = turns.reduce((sum, t) => sum + t.outputTokens, 0);
        const totalEmb = turns.reduce((sum, t) => sum + (t.embeddingTokens || 0), 0) + (strategy.historyPromptTokens || 0);

        const endTime = Date.now();
        const executionTimeMs = endTime - startTime;
        const meanPerTurnMs = turns.reduce((sum, t) => sum + t.executionTimeMs, 0) / turns.length

        return {
            condition,
            runIndex,
            turns,
            metrics: {
                executionTimeMs: executionTimeMs,
                totalInputTokens: totalIn,
                totalOutputTokens: totalOut,
                totalTokens: totalIn + totalOut,
                totalEmbeddingsTokens: totalEmb,
                estimatedCostUsd: (totalIn * PRICE_INPUT) + (totalOut * PRICE_OUTPUT) + (totalEmb * PRICE_INPUT),
                latency: {
                    meanPerTurnMs,
                    medianPerTurnMs: turns.length % 2 === 1 ?
                        [...turns.map(t => t.executionTimeMs)].sort((a, b) => a - b)[Math.floor(turns.length / 2)] :
                        (() => {
                            const sorted = [...turns.map(t => t.executionTimeMs)].sort((a, b) => a - b);
                            const mid = sorted.length / 2;
                            return (sorted[mid - 1] + sorted[mid]) / 2;
                        })(),
                    minPerTurnMs: Math.min(...turns.map(t => t.executionTimeMs)),
                    maxPerTurnMs: Math.max(...turns.map(t => t.executionTimeMs)),
                    stdPerTurnMs: Math.sqrt(turns.reduce((sum, t) => sum + Math.pow(t.executionTimeMs - meanPerTurnMs, 2), 0) / turns.length)
                }
            }
        };
    }

    async runExperiment(
        experimentName: string,
        configurations: Array<{ name: string, factory: any, runs: number }>,
        model: ModelType,
        effort: ReasoningEffort,
        history: Message[],
        script: string[],
        historyPromptMemories: MemoryItem[] = [],
        memoriesTokens: number = 0
    ): Promise<void> {
        const results: any[] = [];

        for (const config of configurations) {
            console.log(`╟┬─ Running configuration: ${config.name}`);
            for (let run = 1; run <= config.runs; run++) {
                process.stdout.write(`║${run === config.runs ? '└' : '├'}── Run ${run}/${config.runs}...`);
                const strategyInstance = config.factory();
                const episodeResult = await this.executeEpisode(
                    config.name,
                    run,
                    strategyInstance,
                    model,
                    effort,
                    history,
                    script,
                    historyPromptMemories,
                    memoriesTokens
                );
                results.push(episodeResult);
                process.stdout.write(` Done. Executed in ${(episodeResult.metrics.executionTimeMs / 1000).toFixed(2)}s.\n`);
            }
        }

        fs.writeFileSync(`./data/experiments/e_${experimentName}.json`, JSON.stringify(results, null, 2));
    }

    async runExperimentSuite(
        suiteName: string,
        configurations: Array<{ name: string, factory: any, runs: number }>,
        model: ModelType,
        effort: ReasoningEffort,
        histories: Message[][],
        scripts: string[][],
        historyPromptMemories: MemoryItem[][] = [],
        memoriesTokens: number[] = [],
        historiesMetadata?: { inputTokens: number, outputTokens: number, totalTokens: number, timestamp: string }[],
        embeddingModel?: string
    ): Promise<void> {
        console.log(`Running experiment suit: ${suiteName}`);
        await sleep(2500);
        console.log(`${scripts.length} scripts to process.`);
        await sleep(1200);
        console.log(`${configurations.length} configurations to run.`);
        await sleep(1500);
        console.log(`Model: ${model}`);
        await sleep(1200);
        console.log(`Effort: ${effort}`);
        await sleep(1500);
        console.log('Configurations:');
        configurations.forEach(async (config) => {
            await sleep(900);
            console.log(`- ${config.name}: ${config.runs} runs`);
        });
        await sleep(2500);
        console.log('----------------------------------------');
        await sleep(1500);

        const experiments: ExperimentResult[] = []

        const SuitStartTime = Date.now();
        for (let i = 0; i < scripts.length; i++) {
            console.log(`${i === 0 ? '╔' : '╠'}═ Run ${i + 1}/${scripts.length}`)
            const history = histories[i];
            const script = scripts[i];
            const experimentName = `${suiteName}_${i}`;
            const memoryTokens = memoriesTokens[i] || 0;
            const startTime = Date.now();
            await this.runExperiment(
                experimentName,
                configurations,
                model,
                effort,
                history,
                script,
                historyPromptMemories[i] || [],
                memoryTokens
            );
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            const durationSec = ((endTime - startTime) / 1000).toFixed(2);

            experiments.push({
                experimentName,
                executionTimeMs: durationMs
            });

            console.log(`${i === scripts.length - 1 ? '╚' : '╠'}═ Experiment completed in ${durationSec}s. Data saved on data/experiments/e_${experimentName}.json`);
        }
        const SuiteEndTime = Date.now();
        const SuiteDurationMs = SuiteEndTime - SuitStartTime;
        const SuiteDurationSec = (SuiteDurationMs / 1000).toFixed(2);
        const ScriptsData = scripts.map(s => ({ hash: computeHash(normalizeScript(s)), content: s }));
        const HistoriesData: SuiteResult['histories'] = []

        for (let i = 0; i < histories.length; i++) {
            const h = histories[i];
            const metadata = historiesMetadata?.[i] || { inputTokens: 0, outputTokens: 0, totalTokens: 0, timestamp: '' }
            HistoriesData.push({ hash: computeHash(normalizeHistory(h)), messages: h, metadata: { inputTokens: metadata.inputTokens, outputTokens: metadata.outputTokens, totalTokens: metadata.totalTokens } });
        }

        const SuiteData: SuiteResult = {
            suiteName,
            model,
            effort,
            conditionConfigurations: configurations.map(c => ({ name: c.name, runs: c.runs })),
            experiments,
            executionTimeMs: SuiteDurationMs,
            embeddingModel: embeddingModel || '',
            scripts: ScriptsData,
            histories: HistoriesData
        }

        fs.writeFileSync(`./data/experimentSuites/s_${suiteName}.json`, JSON.stringify(SuiteData, null, 2));
        console.log(`Suite completed in ${SuiteDurationSec}s. Data saved on data/experimentSuites/s_${suiteName}.json`);
    }
}