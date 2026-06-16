import * as fs from 'fs';
import { IContextComponent, ILanguageModel } from './interfaces';
import {
    Message,
    SuiteResult,
    EpisodeResult,
    StrategyInitParameters,
    TurnResult,
    Script,
    History,
    Tokens,
    scriptType,
    AfterTurnError,
    ModelError
} from './schemas';
import { computeHash, normalizeScript, normalizeHistory, sleep } from '../helpers';
import { ModelType, ReasoningEffort } from './services/OpenAIService';

export class ExperimentRunner {
    private pricing: Record<string, { input: number, output: number }> = {
        'gpt-5-mini': { input: 0.25, output: 2 },
        'gpt-5-nano': { input: 0.05, output: 0.4 },
    };
    private embeddingPricing = 0.02

    constructor(private openAIService: ILanguageModel) { }

    private getStats(values: number[]) {
        const n = values.length;
        if (n === 0) return { meanMs: 0, medianMs: 0, minMs: 0, maxMs: 0, stdMs: 0 };

        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        const sorted = [...values].sort((a, b) => a - b);
        const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
        const min = sorted[0];
        const max = sorted[n - 1];
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const std = Math.sqrt(variance);

        return { meanMs: mean, medianMs: median, minMs: min, maxMs: max, stdMs: std };
    }

    async executeEpisode(
        condition: string,
        runIndex: number,
        component: IContextComponent,
        model: ModelType,
        effort: ReasoningEffort,
        baseHistory: Message[],
        scriptData: { content: string[], scriptId: string, scriptType: scriptType },
        initParams: StrategyInitParameters
    ): Promise<EpisodeResult> {
        const episodeStart = Date.now();
        const script = scriptData.content;
        const history = [...baseHistory];
        const turns: TurnResult[] = [];

        const priceIn = (this.pricing[model]?.input || 0) / 1000000;
        const priceOut = (this.pricing[model]?.output || 0) / 1000000;

        let contextAssemblyTotalTime = 0;
        let modelErrors = 0;
        let afterTurnTotalTime = 0;
        let afterTurnTotalTokens: Tokens = { inputTokens: 0, outputTokens: 0, totalTokens: 0, embeddingTokens: 0 };
        let afterTurnErrors = 0;

        if (component.init) {
            await component.init(initParams);
        }

        for (let i = 0; i < script.length; i++) {
            const turnStart = Date.now();
            const currentQuery = script[i];

            const ctxStart = Date.now();
            const contextMessages = await component.getContext(history, currentQuery);
            const ctxTime = Date.now() - ctxStart;
            contextAssemblyTotalTime += ctxTime;

            const modelStart = Date.now();
            const rawResponse = await this.openAIService.response(contextMessages, effort).catch(e => { return new ModelError('ModelError', 1) });
            const modelTime = Date.now() - modelStart;

            let response = { content: '', inputTokens: 0, outputTokens: 0 }

            if (rawResponse instanceof ModelError) {
                modelErrors += rawResponse.errorCount;
            } else {
                response = rawResponse;
            }

            const userMsg: Message = { role: 'user', content: currentQuery };
            const assistantMsg: Message = { role: 'assistant', content: response.content };
            history.push(userMsg, assistantMsg);

            const afterStart = Date.now();
            const after = await component.afterTurn?.(userMsg, assistantMsg);
            const afterTime = Date.now() - afterStart;
            afterTurnTotalTime += afterTime;

            const turnTotalTime = Date.now() - turnStart;

            let afterTokens;

            if (after instanceof AfterTurnError) {
                afterTurnErrors += after.errorCount;
            } else {
                afterTokens = after;
            }

            const turnAfterTokens = afterTokens || {};

            afterTurnTotalTokens = {
                inputTokens: (afterTurnTotalTokens.inputTokens ?? 0) + (turnAfterTokens.inputTokens ?? 0),
                outputTokens: (afterTurnTotalTokens.outputTokens ?? 0) + (turnAfterTokens.outputTokens ?? 0),
                embeddingTokens: (afterTurnTotalTokens.embeddingTokens ?? 0) + (turnAfterTokens.embeddingTokens ?? 0),
                totalTokens: (afterTurnTotalTokens.inputTokens ?? 0) + (turnAfterTokens.inputTokens ?? 0) + (afterTurnTotalTokens.outputTokens ?? 0) + (turnAfterTokens.outputTokens ?? 0)
            };

            const turnResult: TurnResult = {
                turnIndex: i + 1,
                promptSent: contextMessages,
                modelResponse: response.content,
                phases: {
                    contextAssembly: {
                        executionTimeMs: ctxTime
                    },
                    modelCall: {
                        executionTimeMs: modelTime,
                        inputTokens: response.inputTokens,
                        outputTokens: response.outputTokens,
                        totalTokens: response.inputTokens + response.outputTokens,
                        estimatedCostUsd: (response.inputTokens * priceIn) + (response.outputTokens * priceOut)
                    },
                    afterTurnProcessing: {
                        executionTimeMs: afterTime,
                        inputTokens: turnAfterTokens.inputTokens,
                        outputTokens: turnAfterTokens.outputTokens,
                        totalTokens: (turnAfterTokens.inputTokens ?? 0) + (turnAfterTokens.outputTokens ?? 0),
                        embeddingTokens: turnAfterTokens.embeddingTokens,
                        estimatedCostUsd: ((turnAfterTokens.inputTokens ?? 0) * priceIn) + ((turnAfterTokens.outputTokens ?? 0) * priceOut) + ((turnAfterTokens.embeddingTokens ?? 0) * this.embeddingPricing / 1000000)
                    }
                },
                afterTurnErrors: after instanceof AfterTurnError ? after.errorCount : 0,
                modelErrors: rawResponse instanceof ModelError ? rawResponse.errorCount : 0,
                totalTurnTimeMs: turnTotalTime
            };

            turns.push(turnResult);
        }

        const episodeEnd = Date.now();
        const totalTime = episodeEnd - episodeStart;

        const totalInput = turns.reduce((sum, t) => sum + t.phases.modelCall.inputTokens!, 0);
        const totalOutput = turns.reduce((sum, t) => sum + t.phases.modelCall.outputTokens!, 0);
        const totalModelCost = turns.reduce((sum, t) => sum + t.phases.modelCall.estimatedCostUsd!, 0);
        const totalAfterCost = turns.reduce((sum, t) => sum + (t.phases.afterTurnProcessing?.estimatedCostUsd || 0), 0);
        const executionTimes = turns.map(t => t.phases.modelCall.executionTimeMs);
        const stats = this.getStats(executionTimes);

        return {
            condition,
            scriptType: scriptData.scriptType,
            scriptId: scriptData.scriptId,
            runIndex,
            turns: turns,
            metrics: {
                pipeline: {
                    totalExecutionTimeMs: totalTime,
                    meanTurnTimeMs: totalTime / turns.length,
                    stdTurnTimeMs: this.getStats(turns.map(t => t.totalTurnTimeMs)).stdMs
                },
                contextAssembly: {
                    totalTimeMs: contextAssemblyTotalTime
                },
                modelInference: {
                    totalInputTokens: totalInput,
                    totalOutputTokens: totalOutput,
                    totalTokens: totalInput + totalOutput,
                    totalCostUsd: totalModelCost,
                    latency: {
                        meanMs: stats.meanMs,
                        medianMs: stats.medianMs,
                        stdMs: stats.stdMs,
                        minMs: stats.minMs,
                        maxMs: stats.maxMs
                    },
                    errorCount: modelErrors
                },
                afterTurnProcessing: {
                    totalTimeMs: afterTurnTotalTime,
                    totalTokens: afterTurnTotalTokens,
                    totalCostUsd: totalAfterCost,
                    errorCount: afterTurnErrors
                }
            }
        };
    }

    async runExperiment(
        experimentName: string,
        configurations: Array<{ name: string, factory: () => IContextComponent, runs: number }>,
        model: ModelType,
        effort: ReasoningEffort,
        history: Message[],
        scriptData: { content: string[], scriptId: string, scriptType: scriptType },
        initParams: StrategyInitParameters
    ): Promise<void> {
        const results: EpisodeResult[] = [];

        for (const config of configurations) {
            console.log(`╟┬─ Running configuration: ${config.name}`);

            const promises = Array.from({ length: config.runs }, async (_, i) => {
                const run = i + 1;
                const component = config.factory();

                const result = await this.executeEpisode(
                    config.name,
                    run,
                    component,
                    model,
                    effort,
                    history,
                    scriptData,
                    initParams
                );

                process.stdout.write(`║├── Run ${run}/${config.runs} Done. Executed in ${(result.metrics.pipeline.totalExecutionTimeMs / 1000).toFixed(2)}s.\n`);
                return result;
            });

            const configResults = await Promise.all(promises);
            results.push(...configResults);
        }

        fs.writeFileSync(`./data/experiments/e_${experimentName}.json`, JSON.stringify(results, null, 2));
    }

    async runExperimentSuite(
        suiteName: string,
        configurations: Array<{ name: string, factory: () => IContextComponent, runs: number }>,
        model: ModelType,
        effort: ReasoningEffort,
        scripts: Script[],
        histories: History[],
        experimentalScripts: string[][],
        initParamsList: StrategyInitParameters[],
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

        const allExperimentFiles: { experimentName: string, file: string }[] = [];
        const suiteStartTime = Date.now();

        for (let i = 0; i < scripts.length; i++) {
            console.log(`${i === 0 ? '╔' : '╠'}═ Run ${i + 1}/${scripts.length}`);

            const history = histories[i].messages;
            const script = experimentalScripts[i];
            const scriptId = scripts[i].id;
            const scriptType = scripts[i].type;
            const params = initParamsList[i];
            const experimentName = `${suiteName}_${i}`;

            const startTime = Date.now();

            await this.runExperiment(
                experimentName,
                configurations,
                model,
                effort,
                history,
                { content: script, scriptId, scriptType },
                params
            );

            const endTime = Date.now();
            const durationSec = ((endTime - startTime) / 1000).toFixed(2);

            allExperimentFiles.push({
                experimentName,
                file: `e_${experimentName}.json`
            });

            console.log(`${i === scripts.length - 1 ? '╚' : '╠'}═ Experiment completed in ${durationSec}s. Data saved on data/experiments/e_${experimentName}.json`);
        }

        const suiteEndTime = Date.now();
        const suiteDurationMs = suiteEndTime - suiteStartTime;

        const scriptsData = scripts.map((s, i) => ({
            id: s.id,
            hash: computeHash(normalizeScript(s.entries)),
            type: s.type,
            content: s.entries
        }));

        const historiesData = histories.map(h => ({
            id: h.id,
            hash: computeHash(normalizeHistory(h.messages)),
            cutoffIndex: h.cutoffIndex,
            messages: h.messages
        }));

        const experimentalScriptsData = experimentalScripts.map((s) => ({
            hash: computeHash(normalizeScript(s)),
            content: s
        }));

        const suiteData: SuiteResult = {
            suiteName,
            model,
            reasoningEffort: effort,
            embeddingModel: embeddingModel || '',
            conditionConfigurations: configurations.map(c => ({ name: c.name, runs: c.runs })),
            conditionInitParameters: initParamsList,
            experiments: allExperimentFiles,
            executionTimeMs: suiteDurationMs,
            scripts: scriptsData,
            histories: historiesData,
            experimentalScripts: experimentalScriptsData
        };

        fs.writeFileSync(`./data/experimentSuites/s_${suiteName}.json`, JSON.stringify(suiteData, null, 2));
        console.log(`Suite completed in ${(suiteDurationMs / 1000).toFixed(2)}s. Data saved on data/experimentSuites/s_${suiteName}.json`);
    }
}