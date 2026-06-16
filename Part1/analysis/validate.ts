import { EpisodeRecord, ValidatedEpisode } from "./schemas";

export function validateEpisodeRecord(record: EpisodeRecord): ValidatedEpisode {
    if (record.turnCount <= 0) {
        return { isValid: false, invalidReason: "zeroTurns", record };
    }
    if (record.totalInputTokens < 0 || record.totalOutputTokens < 0 || record.totalEmbeddingTokens < 0) {
        return { isValid: false, invalidReason: "negativeValues", record };
    }
    if (record.suiteName === undefined || record.experimentName === undefined || record.condition === undefined) {
        return { isValid: false, invalidReason: "missingFields", record };
    }
    if (record.scriptHash === undefined || record.scriptSource === undefined ||
        record.historyHash === undefined || record.historySource === undefined) {
        return { isValid: false, invalidReason: "missingFields", record };
    }
    if (record.runIndex === undefined || record.estimatedCostUsd === undefined || record.executionTimeMs === undefined) {
        return { isValid: false, invalidReason: "missingFields", record };
    }
    return { isValid: true, record };
}