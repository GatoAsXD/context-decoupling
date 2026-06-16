import * as fs from 'fs';
import * as path from 'path';
import { AnalyzeExperimentSuite } from './analyzer';

/**
 * Script de ejecución de métricas.
 * Uso: 
 * 1. npx ts-node run-metrics.ts                   -> Procesa todas las suites en /data/experimentSuites/
 * 2. npx ts-node run-metrics.ts "Experiment Name" -> Procesa solo esa suite
 */

async function main() {
    const specificSuite = process.argv[2];
    const suitesDir = path.join(__dirname, '../data/experimentSuites/');
    const outputDir = path.join(__dirname, './metrics/');

    // Asegurar que existe la carpeta de salida
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Creado directorio: ${outputDir}`);
    }

    if (specificSuite) {
        console.log(`🚀 Procesando suite específica: ${specificSuite}...`);
        try {
            AnalyzeExperimentSuite(specificSuite);
        } catch (error) {
            console.error(`❌ Error procesando ${specificSuite}:`, error);
        }
    } else {
        console.log('🔍 Buscando todas las suites disponibles...');
        
        if (!fs.existsSync(suitesDir)) {
            console.error(`❌ No se encontró el directorio de suites en: ${suitesDir}`);
            return;
        }

        const files = fs.readdirSync(suitesDir)
            .filter(f => f.startsWith('s_') && f.endsWith('.json'));

        if (files.length === 0) {
            console.log('⚠️ No se encontraron archivos de suites (deben empezar por "s_").');
            return;
        }

        console.log(`Found ${files.length} suites. Starting processing...`);

        for (const file of files) {
            // Extraer el nombre de la suite del nombre del archivo (s_Nombre.json -> Nombre)
            const suiteName = file.replace(/^s_/, '').replace(/\.json$/, '');
            try {
                AnalyzeExperimentSuite(suiteName);
            } catch (error) {
                console.error(`❌ Error procesando suite del archivo ${file}:`, error);
            }
        }
    }

    console.log('\n✨ Proceso de métricas finalizado.');
}

main().catch(err => {
    console.error('💥 Error crítico en el runner:', err);
    process.exit(1);
});