import {
    EpisodeRecord,
    AggregatedMetrics,
    RetentionMetrics,
    EfficiencyMetrics,
    StabilityMetrics
} from './schemas';

import {
    computeMean,
    computeMedian,
    computeStd,
    computeCV,
    computeTailAmplificationP95,
    computeWorstCaseAmplification
} from './math';

import { AlgorithmicExtractor } from './extraction';



/* ============================================================
   BASE AGGREGATED METRICS
   ============================================================ */

export function computeBaseAggregatedMetrics(
    episodes: EpisodeRecord[],
    type: 'mean' | 'median' | 'min' | 'max' | 'std'
): AggregatedMetrics {

    if (episodes.length === 0) {
        throw new Error("Cannot compute metrics on empty episode set");
    }

    const inputTokens = episodes.map(e => e.totalInputTokens);
    const outputTokens = episodes.map(e => e.totalOutputTokens);
    const embeddingTokens = episodes.map(e => e.totalEmbeddingTokens);
    const turnCounts = episodes.map(e => e.turnCount);
    const costs = episodes.map(e => e.estimatedCostUsd);
    const times = episodes.map(e => e.executionTimeMs);
    const latencies = episodes.map(e => e.meanLatencyPerTurnMs);

    function calc(arr: number[]): number {

        if (arr.length === 0) return 0;

        switch (type) {

            case 'mean':
                return computeMean(arr);

            case 'median':
                return computeMedian(arr);

            case 'min':
                return Math.min(...arr);

            case 'max':
                return Math.max(...arr);

            case 'std':
                return computeStd(arr);
        }
    }

    const llmTokens = inputTokens.map((v, i) =>
        v + outputTokens[i]
    );

    const systemTokens = inputTokens.map((v, i) =>
        v + outputTokens[i] + embeddingTokens[i]
    );

    function safeDiv(a: number, b: number) {
        return b === 0 ? 0 : a / b;
    }

    return {

        totalInputTokens: calc(inputTokens),

        totalOutputTokens: calc(outputTokens),

        totalEmbeddingTokens: calc(embeddingTokens),

        totalLLMTokens: calc(llmTokens),

        totalSystemTokens: calc(systemTokens),

        estimatedCostUsd: calc(costs),

        executionTimeMs: calc(times),

        turnCount: calc(turnCounts),

        inputTokensPerTurn: calc(
            inputTokens.map((v, i) => safeDiv(v, turnCounts[i]))
        ),

        outputTokensPerTurn: calc(
            outputTokens.map((v, i) => safeDiv(v, turnCounts[i]))
        ),

        embeddingTokensPerTurn: calc(
            embeddingTokens.map((v, i) => safeDiv(v, turnCounts[i]))
        ),

        llmTokensPerTurn: calc(
            llmTokens.map((v, i) => safeDiv(v, turnCounts[i]))
        ),

        systemTokensPerTurn: calc(
            systemTokens.map((v, i) => safeDiv(v, turnCounts[i]))
        ),

        costPerTurnUsd: calc(
            costs.map((v, i) => safeDiv(v, turnCounts[i]))
        ),

        latencyPerTurnMs: calc(latencies)
    };
}




/* ============================================================
   ADVANCED METRICS
   ============================================================ */

export function computeAdvancedMetrics(
    episodes: EpisodeRecord[]
): {
    retention: RetentionMetrics,
    efficiency: EfficiencyMetrics,
    stability: StabilityMetrics
} {

    if (episodes.length === 0) {
        throw new Error("Cannot compute advanced metrics on empty episode set");
    }


    /* ========================
       GLOBAL ACCUMULATORS
       ======================== */

    let totalOriginalRecall = 0;
    let totalProgressiveRecall = 0;
    let totalPhase3Recall = 0;
    let totalOriginalOpportunities = 0;
    let totalProgressiveOpportunities = 0;
    let totalPhase3Opportunities = 0;
    let totalDecayTurn = 0;
    let totalContextOverhead = 0;
    let totalTurnsProcessed = 0;
    let totalErrors = 0;


    const latencies = episodes.map(
        e => e.meanLatencyPerTurnMs
    );

    const costs = episodes.map(
        e => e.estimatedCostUsd
    );

    const tokens = episodes.map(
        e => e.totalInputTokens + e.totalOutputTokens
    );


    /* ========================
       PER EPISODE
       ======================== */

    for (const ep of episodes) {

        const scriptFacts =
            AlgorithmicExtractor.extractEntitiesFromScript(
                ep.scriptMessages
            );


        if (scriptFacts.length === 0) {

            totalDecayTurn += ep.turns.length;

            continue;
        }


        let decayTurn = ep.turns.length;

        let episodeDecayDetected = false;


        for (let turnIndex = 0;
             turnIndex < ep.turns.length;
             turnIndex++) {

            const turn = ep.turns[turnIndex];

            const prompt =
                turn.promptSent
                    .map(m => m.content)
                    .join(' ');


            // 1. Original Recall (Global script context)
            const originalRecall =
                AlgorithmicExtractor.calculateRecall(
                    prompt,
                    scriptFacts
                );
            totalOriginalRecall += originalRecall;
            totalOriginalOpportunities += 1;

            // 2. Progressive Recall (Messages sent so far)
            const progressiveRecall =
                AlgorithmicExtractor.calculateProgressiveRecall(
                    prompt,
                    ep.scriptMessages,
                    turnIndex
                );
            totalProgressiveRecall += progressiveRecall;
            totalProgressiveOpportunities += 1;

            // 3. Phase 3 Constraint Recall (turns 11-15 for Phase 1 facts)
            if (turnIndex >= 11) {
                const phase3Recall =
                    AlgorithmicExtractor.calculatePhase3Recall(
                        prompt,
                        ep.scriptMessages
                    );
                totalPhase3Recall += phase3Recall;
                totalPhase3Opportunities += 1;
            }


            if (
                progressiveRecall < 0.20 &&
                !episodeDecayDetected
            ) {
                decayTurn = turnIndex;
                episodeDecayDetected = true;
            }


            const ctxTime =
                turn.phases.contextAssembly?.executionTimeMs ?? 0;

            const modelTime =
                turn.phases.modelCall.executionTimeMs ?? 0;

            const denom = ctxTime + modelTime;

            const overhead =
                denom === 0
                    ? 0
                    : ctxTime / denom;


            totalContextOverhead += overhead;


            totalErrors +=
                turn.modelErrors +
                turn.afterTurnErrors;


            totalTurnsProcessed++;
        }


        totalDecayTurn += decayTurn;
    }



    /* ========================
       FINAL COMPUTATIONS
       ======================== */

    const meanInput =
        computeMean(
            episodes.map(e => e.totalInputTokens)
        );

    const meanOutput =
        computeMean(
            episodes.map(e => e.totalOutputTokens)
        );


    const originalRecallScore =
        totalOriginalOpportunities === 0
            ? 0
            : totalOriginalRecall /
              totalOriginalOpportunities;

    const progressiveRecallScore =
        totalProgressiveOpportunities === 0
            ? 0
            : totalProgressiveRecall /
              totalProgressiveOpportunities;

    const phase3RecallScore =
        totalPhase3Opportunities === 0
            ? 0
            : totalPhase3Recall /
              totalPhase3Opportunities;


    const contextDecayTurn =
        totalDecayTurn /
        episodes.length;


    const pipelineOverheadRatio =
        totalTurnsProcessed === 0
            ? 0
            : totalContextOverhead /
              totalTurnsProcessed;


    const errorRate =
        totalTurnsProcessed === 0
            ? 0
            : totalErrors /
              totalTurnsProcessed;



    return {

        retention: {

            entityRecallScore: progressiveRecallScore, // Compatibility mapping

            originalRecallScore,

            progressiveRecallScore,

            phase3RecallScore,

            contextDecayTurn
        },

        efficiency: {

            tokenROI:
                meanInput === 0
                    ? 0
                    : meanOutput /
                      (meanInput / 1000),

            pipelineOverheadRatio
        },

        stability: {

            latencyCV:
                computeCV(latencies),

            costCV:
                computeCV(costs),

            tokenCV:
                computeCV(tokens),

            tailAmplificationP95:
                computeTailAmplificationP95(
                    latencies
                ),

            worstCaseAmplification:
                computeWorstCaseAmplification(
                    latencies
                ),

            errorRate
        }
    };
}