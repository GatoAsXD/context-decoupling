import * as fs from 'fs';
import { ExperimentResult, SuiteResult } from '../core/schemas';

export function LoadExperimentSuite(suiteName: string): SuiteResult {
    const data = fs.readFileSync(`./data/experimentSuites/s_${suiteName}.json`, 'utf-8');
    return JSON.parse(data);
}

export function LoadExperiment(experimentName: string): ExperimentResult {
    const data = fs.readFileSync(`./data/experiments/e_${experimentName}.json`, 'utf-8');
    return JSON.parse(data);
}