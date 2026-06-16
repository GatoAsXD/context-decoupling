import * as fs from 'fs';
import { SuiteResult, EpisodeResult } from '../core/schemas';
import { EpisodeRecord, ValidatedEpisode, ProcessedSuite, AggregatedConditionResult } from './schemas';
import { computeBaseAggregatedMetrics, computeAdvancedMetrics } from './metrics';

function loadSuite(suiteName: string): SuiteResult {
    const data = fs.readFileSync(`./data/experimentSuites/s_${suiteName}.json`, 'utf-8');
    return JSON.parse(data);
}

function normalizeRecords(suiteData: SuiteResult): EpisodeRecord[] {
    const records: EpisodeRecord[] = [];
    
    suiteData.experiments.forEach((expMeta, i) => {
        const experimentData: EpisodeResult[] = JSON.parse(
            fs.readFileSync(`./data/experiments/e_${expMeta.experimentName}.json`, 'utf-8')
        );
        const scriptMessages = suiteData.scripts[i].content;

        experimentData.forEach(episode => {
            records.push({
                suiteName: suiteData.suiteName,
                experimentName: expMeta.experimentName,
                condition: episode.condition,
                runIndex: episode.runIndex,
                scriptHash: suiteData.scripts[i].hash,
                scriptSource: 'embedded',
                historyHash: suiteData.histories[i].hash,
                historySource: 'embedded',
                turnCount: episode.turns.length,
                totalInputTokens: episode.metrics.modelInference.totalInputTokens,
                totalOutputTokens: episode.metrics.modelInference.totalOutputTokens,
                totalEmbeddingTokens: episode.metrics.afterTurnProcessing?.totalTokens?.embeddingTokens || 0,
                estimatedCostUsd: episode.metrics.modelInference.totalCostUsd + episode.metrics.modelInference.totalCostUsd
                + ((episode.metrics.afterTurnProcessing?.totalTokens?.inputTokens || 0) * 0.05 / 1000000)
                + ((episode.metrics.afterTurnProcessing?.totalTokens?.outputTokens || 0) * 0.4 / 1000000)
                + ((episode.metrics.afterTurnProcessing?.totalTokens?.embeddingTokens || 0) * 0.02 / 1000000),
                executionTimeMs: episode.metrics.pipeline.totalExecutionTimeMs,
                meanLatencyPerTurnMs: episode.metrics.modelInference.latency.meanMs,
                turns: episode.turns,
                scriptMessages: scriptMessages
            });
        });
    });

    return records;
}

function validateRecord(record: EpisodeRecord): ValidatedEpisode {
    if (record.turnCount <= 0) return { isValid: false, invalidReason: "zeroTurns", record };
    if (record.totalInputTokens < 0 || record.totalOutputTokens < 0) return { isValid: false, invalidReason: "negativeValues", record };
    if (!record.condition || !record.experimentName) return { isValid: false, invalidReason: "missingFields", record };
    return { isValid: true, record };
}

export function AnalyzeExperimentSuite(suiteName: string): void {
    const suite = loadSuite(suiteName);
    const records = normalizeRecords(suite);
    
    const validations = records.map(validateRecord);
    const validRecords = validations.filter(v => v.isValid).map(v => v.record);
    const invalidRecords = validations.filter(v => !v.isValid);

    const conditions = Array.from(new Set(validRecords.map(r => r.condition)));
    const aggregatedResults: AggregatedConditionResult[] = [];

    conditions.forEach(condition => {
        const conditionEpisodes = validRecords.filter(r => r.condition === condition);
        
        aggregatedResults.push({
            condition,
            episodeCount: conditionEpisodes.length,
            performance: computeAdvancedMetrics(conditionEpisodes),
            mean: computeBaseAggregatedMetrics(conditionEpisodes, 'mean'),
            median: computeBaseAggregatedMetrics(conditionEpisodes, 'median'),
            std: computeBaseAggregatedMetrics(conditionEpisodes, 'std'),
            min: computeBaseAggregatedMetrics(conditionEpisodes, 'min'),
            max: computeBaseAggregatedMetrics(conditionEpisodes, 'max')
        });
    });

    const processedSuite: ProcessedSuite = {
        metadata: {
            suiteName: suite.suiteName,
            processedAt: new Date().toISOString(),
            model: suite.model,
            effort: suite.reasoningEffort,
            embeddingModel: suite.embeddingModel,
            totalExperiments: suite.experiments.length,
            totalEpisodes: records.length,
            executionTimeMs: suite.executionTimeMs
        },
        integrityReport: {
            totalRecords: records.length,
            validRecords: validRecords.length,
            invalidRecords: invalidRecords.length,
            reasons: {
                zeroTurns: invalidRecords.filter(v => v.invalidReason === 'zeroTurns').length,
                negativeValues: invalidRecords.filter(v => v.invalidReason === 'negativeValues').length,
                missingFields: invalidRecords.filter(v => v.invalidReason === 'missingFields').length
            }
        },
        aggregatedByCondition: aggregatedResults
    };

    fs.writeFileSync(`./metrics/suiteMetrics_${suite.suiteName}.json`, JSON.stringify(processedSuite, null, 2));
    console.log(`✅ Suite ${suite.suiteName} processed. Data saved on metrics/suiteMetrics_${suite.suiteName}.json`);
}