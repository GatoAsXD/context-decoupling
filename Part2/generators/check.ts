import { unlink } from 'fs';
import { checkIfHistoryHasContext, checkIfHistoryHasMemory, generatePlainContext, generatePlainMemories, generateStructuredContext, generateSummarizedMemories, getHistoriesByScriptLength, sleep } from '../helpers';

const scriptLength = 40
const allHistories = [
    ...getHistoriesByScriptLength('cs_v1_EARLY', scriptLength),
    ...getHistoriesByScriptLength('cs_v2_OVERRIDE', scriptLength),
    ...getHistoriesByScriptLength('cs_v3_ACCUMULATION', scriptLength),
    ...getHistoriesByScriptLength('cs_v4_NOISE', scriptLength)
];

const mapped = allHistories.map(h => ({
    h: h,
    plainMemory: checkIfHistoryHasMemory(h, 'plainMemory'),
    summMemory: checkIfHistoryHasMemory(h, 'summarizedMemory'),
    plainContext: checkIfHistoryHasContext(h, 'plainContext'),
    strContext: checkIfHistoryHasContext(h, 'structuredContext')
}))
/*const histories = allHistories.filter(historyId =>
    !checkIfHistoryHasMemory(historyId, 'plainMemory') ||
    !checkIfHistoryHasMemory(historyId, 'summarizedMemory') ||
    !checkIfHistoryHasContext(historyId, 'plainContext') ||
    !checkIfHistoryHasContext(historyId, 'structuredContext')
);*/
const flagged = mapped.filter(e => (e.plainContext || e.plainMemory || e.strContext || e.summMemory) && !(e.plainContext && e.plainMemory && e.strContext && e.summMemory))

for (let i = 0; i < flagged.length; i++) {
    const f = flagged[i];
    const id = f.h.substring(2)
    const plainContext = `c_plainContext_${id}.json`
    const strContext = `c_structuredContext_${id}.json`
    const plainMemory = `m_plainMemory_${id}.json`
    const summMemory = `m_summarizedMemory_${id}.json`
    if(f.plainContext) unlink(`entryData/contexts/${plainContext}`,(e)=>{e ? console.log(e) : console.log(plainContext)})
    if(f.strContext) unlink(`entryData/contexts/${strContext}`,(e)=>{e ? console.log(e) : console.log(strContext)})
    if(f.plainMemory) unlink(`entryData/memories/${plainMemory}`,(e)=>{e ? console.log(e) : console.log(plainMemory)})
    if(f.summMemory) unlink(`entryData/memories/${summMemory}`,(e)=>{e ? console.log(e) : console.log(summMemory)})
}