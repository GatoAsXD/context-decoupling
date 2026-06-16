import { generateScript } from '../helpers';
import { OpenAIService } from '../core/services/OpenAIService';
import { scriptType } from '../core/schemas';
const openAIService = new OpenAIService('gpt-5-mini', 'text-embedding-3-small');

const topics = [
    'Planning an upcoming trip',
    'Recently changing jobs',
    'Struggling to organize daily time',
    'Moving to a new apartment',
    'Preparing for an important exam',
    'Starting an exercise routine',
    'Managing a personal budget',
    'Learning a new language',
    'Buying a new phone or laptop',
    'Having trouble sleeping well',
    'Organizing a family event',
    'Adopting a pet',
    'Deciding to start a master’s degree or course',
    'Issues with a neighbor',
    'Renovating or fixing up the home',
    'Recent changes in eating habits',
    'Excessive phone or social media use',
    'Preparing for a job interview',
    'Moving to a new city',
    'Learning to cook better',
    'Managing stress at work',
    'Saving money for a specific goal',
    'Adjusting to a new schedule',
    'Learning to drive',
    'Choosing a new hobby',
    'Problems with daily transportation',
    'Organizing personal files and documents',
    'Deciding to buy something expensive',
    'Relationship with a boss or coworker',
    'Medium-term plans for the next year'
];

async function genScriptType(scriptType: scriptType) {
    for (const topic of topics) {
        generateScript(topic, scriptType, 40, openAIService);
    }
}
async function process() {
    await genScriptType('cs_v1_EARLY')
    await genScriptType('cs_v2_OVERRIDE')
    await genScriptType('cs_v3_ACCUMULATION')
    await genScriptType('cs_v4_NOISE')
}

process()