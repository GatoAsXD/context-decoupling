import { LoadExperimentSuite } from "./loaders";
import { computeCV, computeIQR, computeMaxAggregatedMetrics, computeMeanAggregatedMetrics, computeMedianAggregatedMetrics, computeMinAggregatedMetrics, computeStdAggregatedMetrics, computeTailAmplificationP95, computeWorstCaseAmplification, filterEpisodesByCondition } from "./metrics";
import { NormalizeRecordsFromSuite } from "./normalize";
import { AggregatedConditionResult, EpisodeRecord, IntegrityReport, ProcessedSuite, StabilityConditionResult, SuiteMetadata } from "./schemas";
import { validateEpisodeRecord } from "./validate";
import * as fs from 'fs'

export function AnalyzeExperimentSuite(suiteName: string): void {
    const suite = LoadExperimentSuite(suiteName);
    const records = NormalizeRecordsFromSuite(suite);
    const recordValidation = records.map(v => validateEpisodeRecord(v));
    const validRecords = recordValidation.filter(v => v.isValid);
    const invalidRecords = recordValidation.filter(v => !v.isValid)
    const invalidReasons = {
        zeroTurns: invalidRecords.filter(v => v.invalidReason === 'zeroTurns').length,
        negativeValues: invalidRecords.filter(v => v.invalidReason === 'negativeValues').length,
        missingFields: invalidRecords.filter(v => v.invalidReason === 'missingFields').length
    };

    const conditionGroups: { condition: string, records: EpisodeRecord[] }[] = [];
    const conditionAggregatedMetrics: AggregatedConditionResult[] = [];
    const conditionStabiltyMetrics: StabilityConditionResult[] = [];

    for (const condition of suite.conditionConfigurations.map(c => c.name)) {
        const conditionRecords = filterEpisodesByCondition(validRecords.map(v => v.record), condition);
        conditionGroups.push({
            condition,
            records: conditionRecords
        });
    }

    for (const conditionGroup of conditionGroups) {
        const condition = conditionGroup.condition;
        const episodes = conditionGroup.records;
        const costValues = episodes.map(e => e.estimatedCostUsd);
        const tokenValues = episodes.map(e => e.totalInputTokens + e.totalOutputTokens);
        const latencyValues = episodes.map(e => e.meanLatencyPerTurnMs)

        const aggregated: AggregatedConditionResult = {
            condition,
            episodeCount: episodes.length,
            mean: computeMeanAggregatedMetrics(episodes),
            median: computeMedianAggregatedMetrics(episodes),
            min: computeMinAggregatedMetrics(episodes),
            max: computeMaxAggregatedMetrics(episodes),
            std: computeStdAggregatedMetrics(episodes)
        }

        const stability: StabilityConditionResult = {
            condition,
            cost: {
                cv: computeCV(costValues),
                iqr: computeIQR(costValues),
                tailAmplificationP95: computeTailAmplificationP95(costValues),
                worstCaseAmplification: computeWorstCaseAmplification(costValues)
            },
            tokens: {
                cv: computeCV(tokenValues),
                iqr: computeIQR(tokenValues),
                tailAmplificationP95: computeTailAmplificationP95(tokenValues),
                worstCaseAmplification: computeWorstCaseAmplification(tokenValues)
            },
            meanLatencyPerTurn: {
                cv: computeCV(latencyValues),
                iqr: computeIQR(latencyValues),
                tailAmplificationP95: computeTailAmplificationP95(latencyValues),
                worstCaseAmplification: computeWorstCaseAmplification(latencyValues)
            }
        }

        conditionAggregatedMetrics.push(aggregated)
        conditionStabiltyMetrics.push(stability)
    }

    const integrityReport: IntegrityReport = {
        totalRecords: records.length,
        validRecords: validRecords.length,
        invalidRecords: invalidRecords.length,

        reasons: invalidReasons
    }

    const suiteMetadata: SuiteMetadata = {
        suiteName: suite.suiteName,
        processedAt: new Date().toISOString(),

        model: suite.model,
        effort: suite.effort,
        embeddingModel: suite.embeddingModel,

        totalExperiments: suite.experiments.length,
        totalEpisodes: records.length,

        executionTimeMs: suite.executionTimeMs
    }

    const processedSuite: ProcessedSuite = {
        metadata: suiteMetadata,
        normalizedEpisodes: recordValidation,

        aggregatedByCondition: conditionAggregatedMetrics,
        stabilityByCondition: conditionStabiltyMetrics,
        integrityReport: integrityReport
    }


    fs.writeFileSync(`./metrics/suiteMetrics_${suite.suiteName}.json`, JSON.stringify(processedSuite, null, 2));
    console.log(`Suite ${suite.suiteName} processed on ${suiteMetadata.processedAt}. Data saved on metrics/suiteMetrics_${suite.suiteName}.json`);
}