import { experimentScriptData, historyData, MemoryData, Message, scriptData, scriptType } from "./core/schemas";
import { OpenAIService } from "./core/services/OpenAIService";
import * as fs from 'fs'
import { MemoryItem, VectorStore } from "./core/memory/vectorStore";
import { createHash } from "crypto";

export async function getEmbeddingFromScript(script: string[], openAIService: OpenAIService, stopIndex?: number): Promise<{ embeddings: number[][], embeddingTokens: number[], totalEmbeddingsTokens: number, scriptRemaining: string[] }> {
    const embeddings: number[][] = [];
    const embeddingTokens: number[] = [];
    const limit = stopIndex !== undefined ? Math.min(stopIndex, script.length) : script.length;
    for (let i = 0; i < limit; i++) {
        const line = script[i];
        const embedding = await openAIService.getEmbedding(line);
        embeddings.push(embedding.embedding);
        embeddingTokens.push(embedding.tokens);
    }
    const totalEmbeddingsTokens: number = embeddingTokens.reduce((sum, t) => sum + t, 0);
    return { embeddings, embeddingTokens, totalEmbeddingsTokens, scriptRemaining: script.slice(limit) };
}

export async function getEmbeddingFromHistory(history: Message[], openAIService: OpenAIService, stopIndex?: number): Promise<{ embeddings: number[][], embeddingTokens: number[], totalEmbeddingsTokens: number, historyRemaining: Message[] }> {
    const embeddings: number[][] = [];
    const embeddingTokens: number[] = [];
    const limit = stopIndex !== undefined ? Math.min(stopIndex, history.length) : history.length;
    for (let i = 0; i < limit; i++) {
        const line = history[i].content;
        const embedding = await openAIService.getEmbedding(line);
        embeddings.push(embedding.embedding);
        embeddingTokens.push(embedding.tokens);
    }
    const totalEmbeddingsTokens: number = embeddingTokens.reduce((sum, t) => sum + t, 0);
    return { embeddings, embeddingTokens, totalEmbeddingsTokens, historyRemaining: history.slice(limit) };
}

export async function generateScript(seedTopic: string, scriptType: scriptType, length: number, openAIService: OpenAIService): Promise<void> {
    const scriptInstructions = fs.readFileSync(`./entryData/scriptTypes/${scriptType}.txt`, 'utf-8');

    const systemPrompt = `
        You are generating a synthetic but realistic user-only conversation script
        for an academic experiment.

        You are NOT part of the system being evaluated.
        Your output will be used as fixed experimental input.

        Do NOT mention memory, context windows, embeddings, evaluation, or AI behavior.
        Write naturally, as a human user would.
    `;
    const userPrompt = `
        Generate a single canonical conversation script consisting ONLY of user messages.

        Requirements:
        - The total length must be exactly: ${length} messages.
        - The seed topic is: "${seedTopic}".
        - The conversation should revolve around this seed topic.
        - Messages must be natural, realistic, and self-consistent.
        - The conversation must include:
        ${scriptInstructions}

        Additional

        Rules:
        - Do NOT explicitly repeat facts verbatim in the final questions.
        - Use indirect references and light inference.
        - Do NOT include assistant responses.
        - Output ONLY a JSON array of strings, no explanations.

        This script will later be split into:
        - an initial conversation history,
        - and a continuation used to test memory retention.
        `;
    const response = await openAIService.response(
        [{ role: 'user', content: userPrompt }],
        'high',
        systemPrompt
    );
    const script = JSON.parse(response.content) as string[];

    const scriptData: scriptData = {
        id: `${scriptType}_L${length}_${seedTopic}`,
        type: scriptType,
        length: length,
        seedTopic: seedTopic,
        messages: script,
        metadata: {
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            totalTokens: response.inputTokens + response.outputTokens,
            timestamp: new Date().toISOString()
        }
    }

    fs.writeFileSync(`./entryData/scripts/${scriptData.id}.json`, JSON.stringify(scriptData, null, 2));
}

export async function generateHistory(seedScriptName: string, cutoff: number, openAIService: OpenAIService): Promise<void> {
    const scriptData: scriptData = getScriptById(seedScriptName);

    const systemPrompt = `
        You are a neutral conversational assistant generating realistic conversation history.

        Your role is to respond naturally and coherently to the user messages you receive, as if participating in a real conversation. You must follow these constraints strictly:

        1. Maintain internal consistency across turns.
        - Do not contradict earlier statements.
        - Preserve implicit context and references when appropriate.

        2. Do not summarize, restate, or highlight information unless explicitly asked by the user.
        - Treat all user-provided information as part of a normal conversation, not as memory to optimize or compress.

        3. When the user provides information without asking a direct question,
        respond with a brief, natural conversational reaction that acknowledges
        the information and, when appropriate, lightly engages with it.
        - Do not merely say “noted”, “understood”, or equivalent.
        - Do not summarize or restate the information.
        - Do not ask follow-up questions unless it would be natural in real conversation.
        - The reaction may briefly acknowledge implications or emotions,
        but must not introduce new facts or reinterpret the user's information.

        4. Do not anticipate future questions or attempt to be helpful beyond what is directly requested.
        - Respond only to the current user message.
        - Do not add reminders, forward references, or meta-commentary.

        5. Use a neutral, professional, and natural conversational tone.
        - Responses may be brief but should feel like genuine engagement,
        not passive acknowledgment.

        6. Do not mention memory systems, experiments, prompts, or evaluation.
        - Act as a standard conversational assistant unaware of any experimental context.

        7. Do not optimize responses for correctness checks or retrieval.
        - Respond as a normal assistant would in a casual but informed conversation.

        8. If the user asks a factual or technical question, answer it accurately and directly.
        - If the user asks an open-ended question, provide a reasonable, bounded response.

        Your sole objective is to produce a realistic, coherent conversation history that could plausibly occur in real usage.
    `;

    const historyScript = scriptData.messages.slice(0, cutoff - 1)
    const experimentScript = scriptData.messages.slice(cutoff)

    const history: Message[] = []
    let inputTokens = 0;
    let outputTokens = 0;

    for (let i = 0; i < historyScript.length; i++) {
        const userMessage = historyScript[i];
        history.push({ role: 'user', content: userMessage });
        const response = await openAIService.response(
            history,
            'medium',
            systemPrompt
        );
        inputTokens += response.inputTokens;
        outputTokens += response.outputTokens;
        history.push({ role: 'assistant', content: response.content });
    }

    const historyData: historyData = {
        id: `h_${seedScriptName.slice(3)}`,
        scriptId: seedScriptName,
        cutoffIndex: cutoff,
        messages: history,
        metadata: {
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
            timestamp: new Date().toISOString()
        }
    }

    const experimentScriptData: experimentScriptData = {
        id: `es_${seedScriptName.slice(3)}`,
        scriptId: seedScriptName,
        historyId: historyData.id,
        cutoffIndex: cutoff,
        messages: experimentScript,
        metadata: {
            timestamp: new Date().toISOString()
        }
    }

    fs.writeFileSync(`./entryData/histories/${historyData.id}.json`, JSON.stringify(historyData, null, 2));
    fs.writeFileSync(`./entryData/experimentScripts/${experimentScriptData.id}.json`, JSON.stringify(experimentScriptData, null, 2));
}

export async function generateMemories(historyId: string, openAIService: OpenAIService): Promise<void> {
    const history = getHistoryById(historyId);
    const messages = history.messages;
    const memories: MemoryItem[] = [];
    let embeddingTokens: number = 0;
    const vectorStore = new VectorStore(openAIService);
    for (let i = 0; i < messages.length; i++) {
        const line = messages[i].content;
        const { tokens, memory } = await vectorStore.createMemory(line);
        memories.push(memory);
        embeddingTokens += tokens;
    }

    const memoryData: MemoryData = {
        id: `m_${history.id.slice(2)}`,
        scriptId: history.scriptId,
        historyId: history.id,
        memories: memories,
        metadata: {
            embeddingTokens: embeddingTokens,
            timestamp: new Date().toISOString()
        }
    };

    fs.writeFileSync(`./entryData/memories/${memoryData.id}.json`, JSON.stringify(memoryData, null, 2));
}

export function getAllScripts(scriptType: scriptType): string[] {
    const scriptFiles = fs.readdirSync(`./entryData/scripts/`);
    const filteredScripts = scriptFiles.filter(file => file.endsWith('.json') && file.startsWith(scriptType));
    return filteredScripts.map(file => file.slice(0, -5));
}

export function getScriptsByLength(scriptType: scriptType, length: number): string[] {
    const scriptFiles = fs.readdirSync(`./entryData/scripts/`);
    const filteredScripts = scriptFiles.filter(file => file.endsWith('.json') && file.startsWith(`${scriptType}_L${length}`));
    return filteredScripts.map(file => file.slice(0, -5));
}

export function getAllHistories(scriptType: scriptType): string[] {
    const historyFiles = fs.readdirSync(`./entryData/histories/`);
    const filteredHistories = historyFiles.filter(file => file.endsWith('.json') && file.startsWith(`h_${scriptType.slice(3)}`));
    return filteredHistories.map(file => file.slice(0, -5));
}

export function getHistoriesByScriptLength(scriptType: scriptType, length: number): string[] {
    const historyFiles = fs.readdirSync(`./entryData/histories/`);
    const filteredHistories = historyFiles.filter(file => file.endsWith('.json') && file.startsWith(`h_${scriptType.slice(3)}_L${length}`));
    return filteredHistories.map(file => file.slice(0, -5));
}

export function getScriptById(scriptId: string): scriptData {
    const script = fs.readFileSync(`./entryData/scripts/${scriptId}.json`, 'utf8');
    return JSON.parse(script);
}

export function getHistoryById(historyId: string): historyData {
    const history = fs.readFileSync(`./entryData/histories/${historyId}.json`, 'utf8');
    return JSON.parse(history);
}

export function getHistoryForScript(scriptId: string): historyData {
    const historyFiles = fs.readdirSync(`./entryData/histories/`);
    const filteredHistory = historyFiles.filter(file => file.endsWith('.json') && file.startsWith(`h_${scriptId.slice(3)}`));
    const historyFile = filteredHistory.map(file => file.slice(0, -5))[0];
    const history = fs.readFileSync(`./entryData/histories/${historyFile}.json`, 'utf8');
    return JSON.parse(history);
}

export function getExperimentScriptForScript(scriptId: string): experimentScriptData {
    const experimentFiles = fs.readdirSync(`./entryData/experimentScripts/`);
    const filteredExperiments = experimentFiles.filter(file => file.endsWith('.json') && file.startsWith(`es_${scriptId.slice(3)}`));
    const experimentScriptFile = filteredExperiments.map(file => file.slice(0, -5))[0];
    const experimentScript = fs.readFileSync(`./entryData/experimentScripts/${experimentScriptFile}.json`, 'utf8');
    return JSON.parse(experimentScript);
}

export function getMemoryForScript(scriptId: string): MemoryData {
    const memoryFiles = fs.readdirSync(`./entryData/memories/`);
    const filteredMemory = memoryFiles.filter(file => file.endsWith('.json') && file.startsWith(`m_${scriptId.slice(3)}`));
    const memoryFile = filteredMemory.map(file => file.slice(0, -5))[0];
    const memory = fs.readFileSync(`./entryData/memories/${memoryFile}.json`, 'utf8');
    return JSON.parse(memory);
}

export function getExperimentScriptForHistory(historyId: string): experimentScriptData {
    const experimentFiles = fs.readdirSync(`./entryData/experimentScripts/`);
    const filteredExperiments = experimentFiles.filter(file => file.endsWith('.json') && file.startsWith(`es_${historyId.slice(2)}`));
    const experimentScriptFile = filteredExperiments.map(file => file.slice(0, -5))[0];
    const experimentScript = fs.readFileSync(`./entryData/experimentScripts/${experimentScriptFile}.json`, 'utf8');
    return JSON.parse(experimentScript);
}

export function checkIfScriptHasHistory(scriptId: string): boolean {
    const historyFiles = fs.readdirSync(`./entryData/histories/`);
    const filteredHistory = historyFiles.filter(file => file.endsWith('.json') && file.startsWith(`h_${scriptId.slice(3)}`));
    return filteredHistory.length > 0;
}

export function checkIfScriptHasExperimentScript(scriptId: string): boolean {
    const experimentFiles = fs.readdirSync(`./entryData/experimentScripts/`);
    const filteredExperiments = experimentFiles.filter(file => file.endsWith('.json') && file.includes(`es_${scriptId.slice(3)}`));
    return filteredExperiments.length > 0;
}

export function checkIfScriptHasMemory(scriptId: string): boolean {
    const memoryFiles = fs.readdirSync(`./entryData/memories/`);
    const filteredMemory = memoryFiles.filter(file => file.endsWith('.json') && file.startsWith(`m_${scriptId.slice(3)}`));
    return filteredMemory.length > 0;
}

export function checkIfHistoryHasExperimentScript(historyId: string): boolean {
    const experimentFiles = fs.readdirSync(`./entryData/experimentScripts/`);
    const filteredExperiments = experimentFiles.filter(file => file.endsWith('.json') && file.includes(`es_${historyId.slice(2)}`));
    return filteredExperiments.length > 0;
}

export function checkIfHistoryHasMemory(historyId: string): boolean {
    const memoryFiles = fs.readdirSync(`./entryData/memories/`);
    const filteredMemory = memoryFiles.filter(file => file.endsWith('.json') && file.startsWith(`m_${historyId.slice(2)}`));
    return filteredMemory.length > 0;
}

export function getRandomScripts(scriptType: scriptType, count: number): string[] {
    const allScripts = getAllScripts(scriptType);
    const verifiedScripts = allScripts.filter(scriptId => checkIfScriptHasHistory(scriptId) && checkIfScriptHasExperimentScript(scriptId));
    const shuffled = shuffleArray(verifiedScripts);
    return shuffled.slice(0, count);
}

export function shuffleArray(array: Array<any>): Array<any> {
    const newArray = array.slice();
    for (var i = newArray.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function computeHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export function normalizeScript(script: string[]): string {
    const normalized = script.map(s => s
        .normalize('NFC')
        .replace(/\r\n/g, '\n')
        .replace(/\u00A0/g, ' ')
        .trim()
    );

    return JSON.stringify(normalized);
}

export function normalizeHistory(history: Message[]): string {
    const normalized = history.map(h => {
        const normalizedRole = h.role
            .normalize('NFC')
            .trim()
            .toLowerCase();
        const normalizedContent = h.content
            .normalize('NFC')
            .replace(/\r\n/g, '\n')
            .replace(/\u00A0/g, ' ')
            .trim()
        return { role: normalizedRole, content: normalizedContent }
    })

    return JSON.stringify(normalized)
}