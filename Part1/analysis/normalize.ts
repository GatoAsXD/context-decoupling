import { EpisodeResult, SuiteResult } from "../core/schemas";
import { EpisodeRecord } from "./schemas";
import * as fs from 'fs';

export function NormalizeRecordsFromSuite(suiteData: SuiteResult): EpisodeRecord[] {
    const records: EpisodeRecord[] = [];
    for (let i = 0; i < suiteData.experiments.length; i++) {
        const experiment = suiteData.experiments[i]
        const script = suiteData.scripts[i]
        const history = suiteData.histories[i]
        records.push(...NormalizeRecordsFromExperiment(experiment.experimentName, script.hash, 'embedded', history.hash, 'embedded'))
    }
    return records
}

export function NormalizeRecordsFromExperiment(experimentName: string, scriptHash: string, scriptSource: 'embedded' | 'external', historyHash: string, historySource: 'embedded' | 'external'): EpisodeRecord[] {
    const records: EpisodeRecord[] = [];

    const experiment = fs.readFileSync(`./data/experiments/e_${experimentName}.json`, 'utf-8');
    const experimentData: EpisodeResult[] = JSON.parse(experiment);

    experimentData.forEach((episode) => {
        const record: EpisodeRecord = {
            suiteName: scriptSource === 'embedded' ? experimentName.slice(0,-2) : '',
            experimentName: experimentName,
            scriptHash: scriptHash,
            scriptSource: scriptSource,
            historyHash: historyHash,
            historySource: historySource,
            condition: episode.condition,
            runIndex: episode.runIndex,
            turnCount: episode.turns.length,
            totalInputTokens: episode.metrics.totalInputTokens,
            totalOutputTokens: episode.metrics.totalOutputTokens,
            totalEmbeddingTokens: episode.metrics.totalEmbeddingsTokens,
            estimatedCostUsd: episode.metrics.estimatedCostUsd,
            executionTimeMs: episode.metrics.executionTimeMs,
            meanLatencyPerTurnMs: episode.metrics.latency.meanPerTurnMs
        };
        records.push(record);
    });

    return records;
}