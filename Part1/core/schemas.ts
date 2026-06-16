import { MemoryItem } from "./memory/vectorStore";
import { ModelType, ReasoningEffort } from "./services/OpenAIService";

export type Role = 'system' | 'user' | 'assistant';
export type scriptType = 'cs_v1_EARLY' | 'cs_v2_EARLY_LATE' | 'cs_v3_INTERSPERSED_1' | 'cs_v4_INTERSPERSED_2';

export interface Message {
    role: Role;
    content: string;
}

export interface TurnRecord {
    turnIndex: number;
    promptSent: Message[];
    modelResponse: string;
    inputTokens: number;
    outputTokens: number;
    executionTimeMs: number;
    embeddingTokens: number;
}

export interface EpisodeResult {
    condition: string;
    runIndex: number;
    turns: TurnRecord[];
    metrics: {
        executionTimeMs: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        totalTokens: number;
        totalEmbeddingsTokens: number;
        estimatedCostUsd: number;
        latency: {
            meanPerTurnMs: number;
            medianPerTurnMs: number;
            minPerTurnMs: number;
            maxPerTurnMs: number;
            stdPerTurnMs: number;
        }
    };
}
export interface ExperimentResult {
    experimentName: string;
    executionTimeMs: number;
}

export interface SuiteResult {
    suiteName: string;
    model: ModelType;
    effort: ReasoningEffort
    embeddingModel: string;
    conditionConfigurations: { name: string; runs: number }[];
    experiments: ExperimentResult[];
    executionTimeMs: number;
    scripts: { hash: string; content: string[] }[];
    histories: { 
        hash: string; 
        messages: Message[];
        metadata: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
        }; 
    }[];
}

export interface Script {
    id: string;
    version: string;
    entries: string[];
}

export interface History {
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

export interface experimentScriptData {
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
    memories: MemoryItem[];
    metadata: {
        embeddingTokens: number;
        timestamp: string;
    }
}