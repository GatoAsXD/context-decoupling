import { AggregatedMetrics, EpisodeRecord, StabilityConditionResult } from './schemas';

export function filterEpisodesByCondition(episodes: EpisodeRecord[], condition: string): EpisodeRecord[] {
    return episodes.filter(episode => episode.condition === condition);
}

export function computeMeanAggregatedMetrics(episodes: EpisodeRecord[]): AggregatedMetrics {
    const totalEpisodes = episodes.length;
    if (totalEpisodes === 0) throw new Error('No episodes to compute metrics.');

    const sumMetrics = episodes.reduce((acc, episode) => {
        acc.totalInputTokens += episode.totalInputTokens;
        acc.totalOutputTokens += episode.totalOutputTokens;
        acc.totalEmbeddingTokens += episode.totalEmbeddingTokens;
        acc.turnCount += episode.turnCount;
        acc.estimatedCostUsd += episode.estimatedCostUsd;
        acc.executionTimeMs += episode.executionTimeMs;
        acc.latencyPerTurnMs += episode.meanLatencyPerTurnMs;
        return acc;
    }, {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalEmbeddingTokens: 0,
        turnCount: 0,
        estimatedCostUsd: 0,
        executionTimeMs: 0,
        latencyPerTurnMs: 0
    });
    return {
        totalInputTokens: sumMetrics.totalInputTokens / totalEpisodes,
        totalOutputTokens: sumMetrics.totalOutputTokens / totalEpisodes,
        totalEmbeddingTokens: sumMetrics.totalEmbeddingTokens / totalEpisodes,
        totalLLMTokens: (sumMetrics.totalInputTokens + sumMetrics.totalOutputTokens) / totalEpisodes,
        totalSystemTokens: (sumMetrics.totalInputTokens + sumMetrics.totalOutputTokens + sumMetrics.totalEmbeddingTokens) / totalEpisodes,

        estimatedCostUsd: sumMetrics.estimatedCostUsd / totalEpisodes,
        executionTimeMs: sumMetrics.executionTimeMs / totalEpisodes,
        turnCount: sumMetrics.turnCount / totalEpisodes,

        inputTokensPerTurn: sumMetrics.totalInputTokens / sumMetrics.turnCount,
        outputTokensPerTurn: sumMetrics.totalOutputTokens / sumMetrics.turnCount,
        embeddingTokensPerTurn: sumMetrics.totalEmbeddingTokens / sumMetrics.turnCount,
        llmTokensPerTurn: (sumMetrics.totalInputTokens + sumMetrics.totalOutputTokens) / sumMetrics.turnCount,
        systemTokensPerTurn: (sumMetrics.totalInputTokens + sumMetrics.totalOutputTokens + sumMetrics.totalEmbeddingTokens) / sumMetrics.turnCount,

        costPerTurnUsd: sumMetrics.estimatedCostUsd / sumMetrics.turnCount,
        latencyPerTurnMs: sumMetrics.latencyPerTurnMs / totalEpisodes
    }
}

export function computePercentile(values: number[], percentile: number): number {
    if (values.length === 0) throw new Error('No values to compute Percentile.');

    if (percentile < 0 || percentile > 100) throw new Error('Invalid Percentile.')

    const sortedValues = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sortedValues.length - 1);

    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index % 1

    if (upper >= sortedValues.length) return sortedValues[lower]

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

export function computeMedian(values: number[]): number {
    return computePercentile(values, 50);
}

export function computeMedianAggregatedMetrics(episodes: EpisodeRecord[]): AggregatedMetrics {
    const totalEpisodes = episodes.length;
    if (totalEpisodes === 0) throw new Error('No episodes to compute metrics.');

    const inputTokens = episodes.map(e => e.totalInputTokens).sort((a, b) => a - b);
    const outputTokens = episodes.map(e => e.totalOutputTokens).sort((a, b) => a - b);
    const embeddingTokens = episodes.map(e => e.totalEmbeddingTokens).sort((a, b) => a - b);
    const turnCounts = episodes.map(e => e.turnCount).sort((a, b) => a - b);
    const estimatedCosts = episodes.map(e => e.estimatedCostUsd).sort((a, b) => a - b);
    const executionTimes = episodes.map(e => e.executionTimeMs).sort((a, b) => a - b);
    const latencyPerTurnMs = episodes.map(e => e.meanLatencyPerTurnMs).sort((a, b) => a - b);
    return {
        totalInputTokens: computeMedian(inputTokens),
        totalOutputTokens: computeMedian(outputTokens),
        totalEmbeddingTokens: computeMedian(embeddingTokens),
        totalLLMTokens: computeMedian(inputTokens.map((val, i) => val + outputTokens[i])),
        totalSystemTokens: computeMedian(inputTokens.map((val, i) => val + outputTokens[i] + embeddingTokens[i])),

        estimatedCostUsd: computeMedian(estimatedCosts),
        executionTimeMs: computeMedian(executionTimes),
        turnCount: computeMedian(turnCounts),

        inputTokensPerTurn: computeMedian(inputTokens.map((val, i) => val / turnCounts[i])),
        outputTokensPerTurn: computeMedian(outputTokens.map((val, i) => val / turnCounts[i])),
        embeddingTokensPerTurn: computeMedian(embeddingTokens.map((val, i) => val / turnCounts[i])),
        llmTokensPerTurn: computeMedian(inputTokens.map((val, i) => (val + outputTokens[i]) / turnCounts[i])),
        systemTokensPerTurn: computeMedian(inputTokens.map((val, i) => (val + outputTokens[i] + embeddingTokens[i]) / turnCounts[i])),

        costPerTurnUsd: computeMedian(estimatedCosts.map((val, i) => val / turnCounts[i])),
        latencyPerTurnMs: computeMedian(latencyPerTurnMs)
    }
}

export function computeMinAggregatedMetrics(episodes: EpisodeRecord[]): AggregatedMetrics {
    const totalEpisodes = episodes.length;
    if (totalEpisodes === 0) throw new Error('No episodes to compute metrics.');

    const minMetrics = episodes.reduce((acc, episode) => {
        acc.totalInputTokens = Math.min(acc.totalInputTokens, episode.totalInputTokens);
        acc.totalOutputTokens = Math.min(acc.totalOutputTokens, episode.totalOutputTokens);
        acc.totalEmbeddingTokens = Math.min(acc.totalEmbeddingTokens, episode.totalEmbeddingTokens);
        acc.totalLLMTokens = Math.min(acc.totalLLMTokens, episode.totalInputTokens + episode.totalOutputTokens);
        acc.totalSystemTokens = Math.min(acc.totalSystemTokens, episode.totalInputTokens + episode.totalOutputTokens + episode.totalEmbeddingTokens);

        acc.estimatedCostUsd = Math.min(acc.estimatedCostUsd, episode.estimatedCostUsd);
        acc.executionTimeMs = Math.min(acc.executionTimeMs, episode.executionTimeMs);
        acc.turnCount = Math.min(acc.turnCount, episode.turnCount);

        acc.inputTokensPerTurn = Math.min(acc.inputTokensPerTurn, episode.totalInputTokens / episode.turnCount);
        acc.outputTokensPerTurn = Math.min(acc.outputTokensPerTurn, episode.totalOutputTokens / episode.turnCount);
        acc.embeddingTokensPerTurn = Math.min(acc.embeddingTokensPerTurn, episode.totalEmbeddingTokens / episode.turnCount);
        acc.llmTokensPerTurn = Math.min(acc.llmTokensPerTurn, (episode.totalInputTokens + episode.totalOutputTokens) / episode.turnCount);
        acc.systemTokensPerTurn = Math.min(acc.systemTokensPerTurn, (episode.totalInputTokens + episode.totalOutputTokens + episode.totalEmbeddingTokens) / episode.turnCount);

        acc.costPerTurnUsd = Math.min(acc.costPerTurnUsd, episode.estimatedCostUsd / episode.turnCount);
        acc.latencyPerTurnMs = Math.min(acc.latencyPerTurnMs, episode.meanLatencyPerTurnMs);
        return acc;
    }, {
        totalInputTokens: Infinity,
        totalOutputTokens: Infinity,
        totalEmbeddingTokens: Infinity,
        totalLLMTokens: Infinity,
        totalSystemTokens: Infinity,

        estimatedCostUsd: Infinity,
        executionTimeMs: Infinity,
        turnCount: Infinity,

        inputTokensPerTurn: Infinity,
        outputTokensPerTurn: Infinity,
        embeddingTokensPerTurn: Infinity,
        llmTokensPerTurn: Infinity,
        systemTokensPerTurn: Infinity,

        costPerTurnUsd: Infinity,
        latencyPerTurnMs: Infinity
    });
    return {
        totalInputTokens: minMetrics.totalInputTokens,
        totalOutputTokens: minMetrics.totalOutputTokens,
        totalEmbeddingTokens: minMetrics.totalEmbeddingTokens,
        totalLLMTokens: minMetrics.totalLLMTokens,
        totalSystemTokens: minMetrics.totalSystemTokens,

        estimatedCostUsd: minMetrics.estimatedCostUsd,
        executionTimeMs: minMetrics.executionTimeMs,
        turnCount: minMetrics.turnCount,

        inputTokensPerTurn: minMetrics.inputTokensPerTurn,
        outputTokensPerTurn: minMetrics.outputTokensPerTurn,
        embeddingTokensPerTurn: minMetrics.embeddingTokensPerTurn,
        llmTokensPerTurn: minMetrics.llmTokensPerTurn,
        systemTokensPerTurn: minMetrics.systemTokensPerTurn,

        costPerTurnUsd: minMetrics.costPerTurnUsd,
        latencyPerTurnMs: minMetrics.latencyPerTurnMs
    }
}

export function computeMaxAggregatedMetrics(episodes: EpisodeRecord[]): AggregatedMetrics {
    const totalEpisodes = episodes.length;
    if (totalEpisodes === 0) throw new Error('No episodes to compute metrics.');

    const maxMetrics = episodes.reduce((acc, episode) => {
        acc.totalInputTokens = Math.max(acc.totalInputTokens, episode.totalInputTokens);
        acc.totalOutputTokens = Math.max(acc.totalOutputTokens, episode.totalOutputTokens);
        acc.totalEmbeddingTokens = Math.max(acc.totalEmbeddingTokens, episode.totalEmbeddingTokens);
        acc.totalLLMTokens = Math.max(acc.totalLLMTokens, episode.totalInputTokens + episode.totalOutputTokens);
        acc.totalSystemTokens = Math.max(acc.totalSystemTokens, episode.totalInputTokens + episode.totalOutputTokens + episode.totalEmbeddingTokens);

        acc.estimatedCostUsd = Math.max(acc.estimatedCostUsd, episode.estimatedCostUsd);
        acc.executionTimeMs = Math.max(acc.executionTimeMs, episode.executionTimeMs);
        acc.turnCount = Math.max(acc.turnCount, episode.turnCount);

        acc.inputTokensPerTurn = Math.max(acc.inputTokensPerTurn, episode.totalInputTokens / episode.turnCount);
        acc.outputTokensPerTurn = Math.max(acc.outputTokensPerTurn, episode.totalOutputTokens / episode.turnCount);
        acc.embeddingTokensPerTurn = Math.max(acc.embeddingTokensPerTurn, episode.totalEmbeddingTokens / episode.turnCount);
        acc.llmTokensPerTurn = Math.max(acc.llmTokensPerTurn, (episode.totalInputTokens + episode.totalOutputTokens) / episode.turnCount);
        acc.systemTokensPerTurn = Math.max(acc.systemTokensPerTurn, (episode.totalInputTokens + episode.totalOutputTokens + episode.totalEmbeddingTokens) / episode.turnCount);

        acc.costPerTurnUsd = Math.max(acc.costPerTurnUsd, episode.estimatedCostUsd / episode.turnCount);
        acc.latencyPerTurnMs = Math.max(acc.latencyPerTurnMs, episode.meanLatencyPerTurnMs)
        return acc;
    }, {
        totalInputTokens: -Infinity,
        totalOutputTokens: -Infinity,
        totalEmbeddingTokens: -Infinity,
        totalLLMTokens: -Infinity,
        totalSystemTokens: -Infinity,

        estimatedCostUsd: -Infinity,
        executionTimeMs: -Infinity,
        turnCount: -Infinity,

        inputTokensPerTurn: -Infinity,
        outputTokensPerTurn: -Infinity,
        embeddingTokensPerTurn: -Infinity,
        llmTokensPerTurn: -Infinity,
        systemTokensPerTurn: -Infinity,

        costPerTurnUsd: -Infinity,
        latencyPerTurnMs: -Infinity,
    });
    return {
        totalInputTokens: maxMetrics.totalInputTokens,
        totalOutputTokens: maxMetrics.totalOutputTokens,
        totalEmbeddingTokens: maxMetrics.totalEmbeddingTokens,
        totalLLMTokens: maxMetrics.totalLLMTokens,
        totalSystemTokens: maxMetrics.totalSystemTokens,

        estimatedCostUsd: maxMetrics.estimatedCostUsd,
        executionTimeMs: maxMetrics.executionTimeMs,
        turnCount: maxMetrics.turnCount,

        inputTokensPerTurn: maxMetrics.inputTokensPerTurn,
        outputTokensPerTurn: maxMetrics.outputTokensPerTurn,
        embeddingTokensPerTurn: maxMetrics.embeddingTokensPerTurn,
        llmTokensPerTurn: maxMetrics.llmTokensPerTurn,
        systemTokensPerTurn: maxMetrics.systemTokensPerTurn,

        costPerTurnUsd: maxMetrics.costPerTurnUsd,
        latencyPerTurnMs: maxMetrics.latencyPerTurnMs
    }
}

export function computeStdAggregatedMetrics(episodes: EpisodeRecord[]): AggregatedMetrics {
    const totalEpisodes = episodes.length;
    if (totalEpisodes === 0) throw new Error('No episodes to compute metrics.');

    const meanMetrics = computeMeanAggregatedMetrics(episodes);

    const varianceMetrics = episodes.reduce((acc, episode) => {
        acc.totalInputTokens += Math.pow(episode.totalInputTokens - meanMetrics.totalInputTokens, 2);
        acc.totalOutputTokens += Math.pow(episode.totalOutputTokens - meanMetrics.totalOutputTokens, 2);
        acc.totalEmbeddingTokens += Math.pow(episode.totalEmbeddingTokens - meanMetrics.totalEmbeddingTokens, 2);
        acc.totalLLMTokens += Math.pow((episode.totalInputTokens + episode.totalOutputTokens) - meanMetrics.totalLLMTokens, 2);
        acc.totalSystemTokens += Math.pow((episode.totalInputTokens + episode.totalOutputTokens + episode.totalEmbeddingTokens) - meanMetrics.totalSystemTokens, 2);

        acc.estimatedCostUsd += Math.pow(episode.estimatedCostUsd - meanMetrics.estimatedCostUsd, 2);
        acc.executionTimeMs += Math.pow(episode.executionTimeMs - meanMetrics.executionTimeMs, 2);
        acc.turnCount += Math.pow(episode.turnCount - meanMetrics.turnCount, 2);

        acc.inputTokensPerTurn += Math.pow((episode.totalInputTokens / episode.turnCount) - meanMetrics.inputTokensPerTurn, 2);
        acc.outputTokensPerTurn += Math.pow((episode.totalOutputTokens / episode.turnCount) - meanMetrics.outputTokensPerTurn, 2);
        acc.embeddingTokensPerTurn += Math.pow((episode.totalEmbeddingTokens / episode.turnCount) - meanMetrics.embeddingTokensPerTurn, 2);
        acc.llmTokensPerTurn += Math.pow(((episode.totalInputTokens + episode.totalOutputTokens) / episode.turnCount) - meanMetrics.llmTokensPerTurn, 2);
        acc.systemTokensPerTurn += Math.pow(((episode.totalInputTokens + episode.totalOutputTokens + episode.totalEmbeddingTokens) / episode.turnCount) - meanMetrics.systemTokensPerTurn, 2);

        acc.costPerTurnUsd += Math.pow((episode.estimatedCostUsd / episode.turnCount) - meanMetrics.costPerTurnUsd, 2);
        acc.latencyPerTurnMs += Math.pow(episode.meanLatencyPerTurnMs - meanMetrics.latencyPerTurnMs, 2)
        return acc;
    }, {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalEmbeddingTokens: 0,
        totalLLMTokens: 0,
        totalSystemTokens: 0,

        estimatedCostUsd: 0,
        executionTimeMs: 0,
        turnCount: 0,

        inputTokensPerTurn: 0,
        outputTokensPerTurn: 0,
        embeddingTokensPerTurn: 0,
        llmTokensPerTurn: 0,
        systemTokensPerTurn: 0,

        costPerTurnUsd: 0,
        latencyPerTurnMs: 0
    });
    return {
        totalInputTokens: Math.sqrt(varianceMetrics.totalInputTokens / totalEpisodes),
        totalOutputTokens: Math.sqrt(varianceMetrics.totalOutputTokens / totalEpisodes),
        totalEmbeddingTokens: Math.sqrt(varianceMetrics.totalEmbeddingTokens / totalEpisodes),
        totalLLMTokens: Math.sqrt(varianceMetrics.totalLLMTokens / totalEpisodes),
        totalSystemTokens: Math.sqrt(varianceMetrics.totalSystemTokens / totalEpisodes),

        estimatedCostUsd: Math.sqrt(varianceMetrics.estimatedCostUsd / totalEpisodes),
        executionTimeMs: Math.sqrt(varianceMetrics.executionTimeMs / totalEpisodes),
        turnCount: Math.sqrt(varianceMetrics.turnCount / totalEpisodes),

        inputTokensPerTurn: Math.sqrt(varianceMetrics.inputTokensPerTurn / totalEpisodes),
        outputTokensPerTurn: Math.sqrt(varianceMetrics.outputTokensPerTurn / totalEpisodes),
        embeddingTokensPerTurn: Math.sqrt(varianceMetrics.embeddingTokensPerTurn / totalEpisodes),
        llmTokensPerTurn: Math.sqrt(varianceMetrics.llmTokensPerTurn / totalEpisodes),
        systemTokensPerTurn: Math.sqrt(varianceMetrics.systemTokensPerTurn / totalEpisodes),

        costPerTurnUsd: Math.sqrt(varianceMetrics.costPerTurnUsd / totalEpisodes),
        latencyPerTurnMs: Math.sqrt(varianceMetrics.latencyPerTurnMs / totalEpisodes)
    }
}

export function computeIQR(values: number[]): number {
    if (values.length === 0) throw new Error('No values to compute IQR.');

    const q1 = computePercentile(values, 25)
    const q3 = computePercentile(values, 75)
    return q3 - q1;
}

export function computeCV(values: number[]): number {
    const mean = values.reduce((acc, value) => {
        return acc += value;
    }, 0) / values.length;
    const std = Math.sqrt(values.reduce((acc, value) => { return acc += Math.pow(value - mean, 2) }, 0) / values.length);

    return (std / mean) * 100;
}

export function computeTailAmplificationP95(values: number[]): number {
    const median = computeMedian(values);
    const tailP95 = computePercentile(values, 95);

    return tailP95 / median;
}

export function computeWorstCaseAmplification(values: number[]): number {
    const median = computeMedian(values);
    const max = Math.max(...values);

    return max / median;
}