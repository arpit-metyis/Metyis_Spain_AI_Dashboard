import type { QueryResult, ValidatedResult } from './responseSchemas';
import { getMetric } from './semanticResolver';

export function validateResult(result: QueryResult, metricIds: string[]): ValidatedResult {
  const warnings = [...result.warnings];
  if (result.rows.length === 0) warnings.push('No data was available for the requested slice.');

  for (const metricId of metricIds) {
    const metric = getMetric(metricId);
    if (!metric) {
      warnings.push(`Metric ${metricId} is not defined.`);
      continue;
    }
    if (metric.formula.includes('nullif') && result.rows.some(row => Number(row.denominator ?? 1) === 0)) {
      warnings.push(`${metric.label} contains rows with a zero denominator.`);
    }
  }

  const formats = Object.fromEntries(metricIds.map(metricId => [metricId, getMetric(metricId)?.format ?? 'number']));
  return {
    ...result,
    warnings: Array.from(new Set(warnings)),
    confidence: result.source === 'insufficient_data' || warnings.length > 1 ? 'low' : warnings.length === 1 ? 'medium' : 'high',
    formats,
  };
}
