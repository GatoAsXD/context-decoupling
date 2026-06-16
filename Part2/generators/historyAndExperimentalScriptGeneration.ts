import { checkIfScriptHasExperimentalScript, checkIfScriptHasHistory, generateHistory, getScriptsByLength } from '../helpers';
import { OpenAIService } from '../core/services/OpenAIService';

const openAIService = new OpenAIService('gpt-5-mini', 'text-embedding-3-small');

const scriptLength = 40
const allScripts = [...getScriptsByLength('cs_v1_EARLY', scriptLength), ...getScriptsByLength('cs_v2_OVERRIDE', scriptLength), ...getScriptsByLength('cs_v3_ACCUMULATION', scriptLength), ...getScriptsByLength('cs_v4_NOISE', scriptLength)];
const scripts = allScripts.filter(scriptId => !checkIfScriptHasHistory(scriptId) && !checkIfScriptHasExperimentalScript(scriptId));
const experimentScriptLength = 16
const historyLength = scriptLength - experimentScriptLength

async function processScripts() {
    for (const scriptId of scripts) {
        await generateHistory(scriptId, historyLength, openAIService);
    }
}

processScripts().catch(err => {
    console.error('Error during history generation:', err);
});