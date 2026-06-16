import { ModelType } from "../core/services/OpenAIService";
import { TurnResult } from "../core/schemas";

export type invalidReason = 'zeroTurns' | 'negativeValues' | 'missingFields';

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
    
    // Necesario para evaluar retención y decaimiento
    turns: TurnResult[]; 
    scriptMessages: string[]; 
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

export interface RetentionMetrics {
    entityRecallScore: number; // Maintains compatibility, mapped to progressiveRecallScore
    originalRecallScore: number; // Original full-script recall
    progressiveRecallScore: number; // Progressive recall (causal turn-by-turn)
    phase3RecallScore: number; // Phase 3 evaluation-phase recall
    contextDecayTurn: number; // Turno promedio donde las entidades iniciales desaparecen
}

export interface EfficiencyMetrics {
    tokenROI: number; // Output Tokens / (Input Tokens / 1000)
    pipelineOverheadRatio: number; // % del tiempo en Context Assembly vs Inferencia
}

export interface StabilityMetrics {
    latencyCV: number;
    costCV: number;
    tokenCV: number;
    tailAmplificationP95: number;
    worstCaseAmplification: number;
    errorRate: number;
}

export interface AggregatedConditionResult {
    condition: string;
    episodeCount: number;
    
    performance: {
        retention: RetentionMetrics;
        efficiency: EfficiencyMetrics;
        stability: StabilityMetrics;
    };

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
    effort: string;
    embeddingModel: string;
    totalExperiments: number;
    totalEpisodes: number;
    executionTimeMs: number;
}

export interface ProcessedSuite {
    metadata: SuiteMetadata;
    integrityReport: IntegrityReport;
    aggregatedByCondition: AggregatedConditionResult[];
}