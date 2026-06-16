export function computePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    if (percentile < 0 || percentile > 100) throw new Error('Invalid Percentile.');
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index % 1;
    if (upper >= sorted.length) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeMedian(values: number[]): number {
    return computePercentile(values, 50);
}

export function computeStd(values: number[], mean?: number): number {
    if (values.length === 0) return 0;
    const m = mean ?? computeMean(values);
    const variance = values.reduce((a, b) => a + Math.pow(b - m, 2), 0) / values.length;
    return Math.sqrt(variance);
}

export function computeCV(values: number[]): number {
    const mean = computeMean(values);
    if (mean === 0) return 0;
    return (computeStd(values, mean) / mean) * 100;
}

export function computeTailAmplificationP95(values: number[]): number {
    const median = computeMedian(values);
    if (median === 0) return 0;
    return computePercentile(values, 95) / median;
}

export function computeWorstCaseAmplification(values: number[]): number {
    const median = computeMedian(values);
    if (median === 0) return 0;
    return Math.max(...values) / median;
}