import { MemoryItem } from "./services/vectorStore";
import { ModelType, ReasoningEffort } from "./services/OpenAIService";

export type Role = 'system' | 'user' | 'assistant';
export type scriptType = 'cs_v1_EARLY' | 'cs_v2_OVERRIDE' | 'cs_v3_ACCUMULATION' | 'cs_v4_NOISE';

export interface Message {
    role: Role;
    content: string;
}

export interface Tokens {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    embeddingTokens?: number;
}

export interface Context {
    goal: string[];
    constraints: string[];
    decisions: string[];
    entities: string[];
    open: string[];
}

export interface StrategyInitParameters {
    tokens: Tokens;
    plainMemories: MemoryItem[];
    summarizedMemories: MemoryItem[];
    plainContext: string;
    structuredContext: Context;
}

export class AfterTurnError extends Error {
    constructor (message: string, public readonly errorCount: number) {
        super(message);
    }
}
export class ModelError extends Error {
    constructor (message: string, public readonly errorCount: number) {
        super(message);
    }
}

export interface PhaseMetrics {
    executionTimeMs: number;

    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;

    embeddingTokens?: number;

    estimatedCostUsd?: number;
}

export interface TurnResult {
    turnIndex: number;

    promptSent: Message[];
    modelResponse: string;

    phases: {
        contextAssembly?: PhaseMetrics;
        modelCall: PhaseMetrics;
        afterTurnProcessing?: PhaseMetrics;
    };

    modelErrors: number;
    afterTurnErrors: number;

    contextComposition?: {
        historyTokens?: number;
        structuredContextTokens?: number;
        plainContextTokens?: number;
        memoryTokens?: number;
        summarizedMemoryTokens?: number;
    };

    totalTurnTimeMs: number;
}

export interface EpisodeResult {
    condition: string;
    scriptType: string;
    scriptId: string;
    runIndex: number;

    turns: TurnResult[];

    metrics: {
        pipeline: {
            totalExecutionTimeMs: number;
            meanTurnTimeMs: number;
            stdTurnTimeMs: number;
        };

        contextAssembly?: {
            totalTimeMs: number;
        };

        modelInference: {
            totalInputTokens: number;
            totalOutputTokens: number;
            totalTokens: number;
            totalCostUsd: number;
            latency: {
                meanMs: number;
                medianMs: number;
                stdMs: number;
                minMs: number;
                maxMs: number;
            };
            errorCount: number;
        };

        afterTurnProcessing?: {
            totalTimeMs: number;
            totalTokens?: Tokens;
            totalCostUsd?: number;
            errorCount: number;
        };
    };
}

export interface SuiteResult {
    suiteName: string;

    model: ModelType;
    reasoningEffort: ReasoningEffort;
    embeddingModel: string;

    conditionConfigurations: {
        name: string;
        runs: number;
    }[];

    conditionInitParameters: StrategyInitParameters[];

    experiments: {
        experimentName: string;
        file: string;
    }[];

    scripts: {
        id: string;
        hash: string;
        type: string;
        content: string[];
    }[];

    histories: {
        id: string;
        hash: string;
        cutoffIndex: number;
        messages: Message[];
    }[];

    experimentalScripts: {
        hash: string;
        content: string[];
    }[];

    executionTimeMs: number;
}

export interface Script {
    id: string;
    type: scriptType;
    entries: string[];
}

export interface History {
    id: string;
    scriptId: string;
    cutoffIndex: number;
    messages: Message[];
}

export interface scriptData {
    id: string;
    type: scriptType;
    seedTopic: string;
    length: number;
    messages: string[];
    metadata: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        timestamp: string;
    }
}

export interface historyData {
    id: string;
    scriptId: string;
    cutoffIndex: number;
    messages: Message[];
    metadata: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        timestamp: string;
    }
}

export interface experimentalScriptData {
    id: string;
    scriptId: string;
    historyId: string;
    cutoffIndex: number;
    messages: string[];
    metadata: {
        timestamp: string;
    }
}

export interface MemoryData {
    id: string;

    scriptId: string;
    historyId: string;

    componentType: 'plainMemory' | 'summarizedMemory';

    memories: MemoryItem[];

    generationMetrics: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        embeddingTokens?: number;
    };

    timestamp: string;
}

export interface ContextData {
    id: string;

    scriptId: string;
    historyId: string;

    componentType: 'plainContext' | 'structuredContext';

    context: string | Context;

    generationMetrics: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };

    timestamp: string;
}