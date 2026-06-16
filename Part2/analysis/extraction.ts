export class AlgorithmicExtractor {
    // Lista comprensiva de stop words en inglés (pronombres, preposiciones, conectores, etc.)
    private static STOP_WORDS = new Set([
        'about', 'above', 'across', 'after', 'again', 'against', 'almost',
        'also', 'although', 'always', 'among', 'another', 'around', 'because', 
        'been', 'before', 'being', 'below', 'between', 'could', 'doing',
        'down', 'during', 'early', 'either', 'enough', 'every', 'further',
        'having', 'herself', 'himself', 'however', 'into', 'itself', 'little',
        'many', 'more', 'most', 'much', 'must', 'myself', 'never', 'only',
        'other', 'ourselves', 'over', 'right', 'said', 'same', 'should',
        'since', 'some', 'still', 'such', 'than', 'that', 'their', 'theirs',
        'them', 'themselves', 'then', 'there', 'these', 'they', 'thing', 
        'things', 'think', 'this', 'those', 'through', 'under', 'until',
        'upon', 'very', 'want', 'were', 'what', 'when', 'where', 'which',
        'while', 'would', 'your', 'yours', 'yourself', 'yourselves', 'hello',
        'please', 'thanks', 'thank', 'really', 'there', 'their'
    ]);

    /**
     * Extrae palabras clave significativas de los mensajes del script.
     * Busca palabras largas (>= 5 caracteres) que no sean stop words.
     */
    static extractEntitiesFromScript(messages: string[]): string[] {
        const text = messages.join(' ').toLowerCase();
        
        // Regex actualizada para el alfabeto inglés (sin tildes ni eñes)
        const words = text.match(/\b[a-z]{5,}\b/g) || [];
        
        const uniqueWords = new Set<string>();
        for (const word of words) {
            if (!this.STOP_WORDS.has(word)) {
                uniqueWords.add(word);
            }
        }
        return Array.from(uniqueWords);
    }

    /**
     * Calcula qué porcentaje de las entidades extraídas están presentes en el contexto enviado (promptSent).
     */
    static calculateRecall(promptContent: string, entities: string[]): number {
        if (entities.length === 0) return 1;
        const lowerPrompt = promptContent.toLowerCase();
        const found = entities.filter(e => lowerPrompt.includes(e));
        return found.length / entities.length;
    }

    /**
     * Extrae entidades de forma progresiva (causal).
     * Toma los mensajes del script hasta el índice del turno actual (inclusive),
     * garantizando que no haya data leakage (fuga de información del futuro).
     */
    static extractProgressiveEntities(messages: string[], turnIndex: number): string[] {
        const messagesSoFar = messages.slice(0, turnIndex + 1);
        return this.extractEntitiesFromScript(messagesSoFar);
    }

    /**
     * Extrae entidades correspondientes a la fase de restricciones iniciales (Fase 1).
     * En nuestro diseño de 16 turnos, esto corresponde a los primeros 4 mensajes (turnos 0-3).
     */
    static extractPhase3Entities(messages: string[]): string[] {
        const earlyMessages = messages.slice(0, 4);
        return this.extractEntitiesFromScript(earlyMessages);
    }

    /**
     * Calcula el Recall Progresivo para un turno determinado.
     * Evalúa las entidades acumuladas hasta el turno actual en el prompt del sistema.
     */
    static calculateProgressiveRecall(promptContent: string, messages: string[], turnIndex: number): number {
        const entities = this.extractProgressiveEntities(messages, turnIndex);
        return this.calculateRecall(promptContent, entities);
    }

    /**
     * Calcula el Recall de Fase 3 (Restricción bajo distracción).
     * Evalúa la presencia de las entidades de la Fase 1 en el prompt del sistema del turno actual.
     */
    static calculatePhase3Recall(promptContent: string, messages: string[]): number {
        const entities = this.extractPhase3Entities(messages);
        return this.calculateRecall(promptContent, entities);
    }
}