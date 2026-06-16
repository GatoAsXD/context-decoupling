import { checkIfScriptHasExperimentScript, checkIfScriptHasHistory, generateHistory, getScriptsByLength } from '../helpers';
import { OpenAIService } from '../core/services/OpenAIService';

const openAIService = new OpenAIService('gpt-5-mini', 'text-embedding-3-small');

const scriptLength = 40
const allScripts = getScriptsByLength('cs_v1_EARLY', scriptLength);
const scripts = allScripts.filter(scriptId => !checkIfScriptHasHistory(scriptId) && !checkIfScriptHasExperimentScript(scriptId));
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