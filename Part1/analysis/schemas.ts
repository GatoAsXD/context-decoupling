import { ModelType } from "../core/services/OpenAIService";

export type invalidReason = 'zeroTurns' | 'negativeValues' | 'missingFields'

export interface EpisodeRecord {
    suiteName: string;
    experimentName: string;
    condition: string;

    runIndex: number;

    scriptHash: string;
    scriptSource: 'embedded' | 'external';
    historyHash: string;
    historySource: 'embedded' | 'external';

    turnCount: number;

    totalInputTokens: number;
    totalOutputTokens: number;
    totalEmbeddingTokens: number;

    estimatedCostUsd: number;
    executionTimeMs: number;

    meanLatencyPerTurnMs: number;
}

export interface ValidatedEpisode {
    isValid: boolean;
    invalidReason?: invalidReason;
    record: EpisodeRecord;
}

export interface IntegrityReport {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;

    reasons?: {
        zeroTurns?: number;
        negativeValues?: number;
        missingFields?: number;
    };
}

export interface AggregatedMetrics {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalEmbeddingTokens: number;
    totalLLMTokens: number;
    totalSystemTokens: number;

    estimatedCostUsd: number;
    executionTimeMs: number;
    turnCount: number;

    inputTokensPerTurn: number;
    outputTokensPerTurn: number;
    embeddingTokensPerTurn: number;
    llmTokensPerTurn: number;
    systemTokensPerTurn: number;

    costPerTurnUsd: number;
    latencyPerTurnMs: number;
}


export interface AggregatedConditionResult {
    condition: string;
    episodeCount: number;

    mean: AggregatedMetrics;
    median: AggregatedMetrics;
    std: AggregatedMetrics;
    min: AggregatedMetrics;
    max: AggregatedMetrics;
}

export interface SuiteMetadata {
    suiteName: string;
    processedAt: string;

    model: ModelType;
    effort: 'low' | 'medium' | 'high';
    embeddingModel: string;

    totalExperiments: number;
    totalEpisodes: number;

    executionTimeMs: number;
}

export interface StabilityConditionResult {
    condition: string;

    cost: {
        cv: number;
        iqr: number;
        tailAmplificationP95: number;
        worstCaseAmplification: number;
    };

    tokens: {
        cv: number;
        iqr: number;
        tailAmplificationP95: number;
        worstCaseAmplification: number;
    };

    meanLatencyPerTurn: {
        cv: number;
        iqr: number;
        tailAmplificationP95: number;
        worstCaseAmplification: number;
    };
}


export interface ProcessedSuite {
    metadata: SuiteMetadata;
    normalizedEpisodes: ValidatedEpisode[];

    aggregatedByCondition: AggregatedConditionResult[];
    stabilityByCondition: StabilityConditionResult[];
    integrityReport: IntegrityReport;
}