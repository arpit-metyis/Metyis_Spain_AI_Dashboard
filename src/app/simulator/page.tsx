'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import {
  SCENARIO_USER_ID,
  businessUnitOptions,
  calculateScenario,
  countryOptions,
  defaultScenarioInput,
  productOptions,
  timeHorizonOptions,
} from '@/lib/scenario-simulator';
import type { SavedScenario, ScenarioBaseline, ScenarioInput, ScenarioResult } from '@/lib/data/types';

const LOCAL_STORAGE_KEY = 'metyis-spain-scenarios';

type SimulationState = {
  baseline: ScenarioBaseline;
  result: ScenarioResult;
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return `${value >= 1000 ? `${(value / 1000).toFixed(1)}B` : value.toFixed(1)} MEUR`;
}

function formatDelta(value: number, suffix = '') {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;
}

function loadLocalScenarios(): SavedScenario[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalScenarios(scenarios: SavedScenario[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scenarios));
}

function upsertLocalScenario(scenario: SavedScenario) {
  const scenarios = loadLocalScenarios();
  const next = [scenario, ...scenarios.filter(item => item.id !== scenario.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  saveLocalScenarios(next);
  return next;
}

export default function ScenarioSimulatorPage() {
  const [input, setInput] = useState<ScenarioInput>(defaultScenarioInput);
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [status, setStatus] = useState('Ready');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const local = loadLocalScenarios();
    if (local.length) setScenarios(local);
    fetch(`/api/scenarios?userId=${SCENARIO_USER_ID}`)
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (!payload?.scenarios?.length) return;
        setScenarios(payload.scenarios);
        saveLocalScenarios(payload.scenarios);
      })
      .catch(() => {
        setStatus('Using locally saved scenarios');
      });
  }, []);

  const resultCards = useMemo(() => {
    if (!simulation) return [];
    return [
      { label: 'Simulated Revenue', value: formatMoney(simulation.result.simulatedRevenue), delta: formatDelta(simulation.result.revenueDelta, ' MEUR'), icon: 'payments' },
      { label: 'Simulated Margin', value: `${simulation.result.simulatedMarginPct.toFixed(1)}%`, delta: formatDelta(simulation.result.marginDelta, ' pts'), icon: 'percent' },
      { label: 'Simulated Units', value: `${simulation.result.simulatedUnits.toFixed(0)}K`, delta: `${formatDelta(simulation.result.simulatedUnits - simulation.baseline.units, 'K')}`, icon: 'inventory_2' },
      { label: 'Simulated Churn', value: `${simulation.result.simulatedChurnPct.toFixed(1)}%`, delta: formatDelta(simulation.result.simulatedChurnPct - simulation.baseline.churnPct, ' pts'), icon: 'person_remove' },
    ];
  }, [simulation]);

  function updateField(field: keyof ScenarioInput, value: string | number) {
    setInput(current => ({ ...current, [field]: value }));
  }

  async function runSimulation(nextInput = input) {
    setIsBusy(true);
    setStatus('Running simulation');
    try {
      const response = await fetch('/api/scenarios/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextInput),
      });
      if (!response.ok) throw new Error('Simulation request failed');
      const payload = await response.json();
      setSimulation({ baseline: payload.baseline, result: payload.result });
      setStatus('Simulation ready');
      return payload as SimulationState;
    } catch {
      const baseline: ScenarioBaseline = { revenue: 315, marginPct: 27.8, units: 48, churnPct: 4.2 };
      const result = calculateScenario(nextInput, baseline);
      const localSimulation = { baseline, result };
      setSimulation(localSimulation);
      setStatus('Simulation ready from local fallback');
      return localSimulation;
    } finally {
      setIsBusy(false);
    }
  }

  async function saveScenario(event: FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setStatus('Saving scenario');
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Save request failed');
      const payload = await response.json();
      setScenarios(upsertLocalScenario(payload.scenario));
      setSimulation({ baseline: payload.scenario.baseline, result: payload.scenario.result });
      setInput(payload.scenario.input);
      setStatus('Scenario saved');
    } catch {
      const localSimulation = simulation ?? await runSimulation(input);
      const now = new Date().toISOString();
      const id = input.scenarioId || `local-${Date.now()}`;
      const scenario: SavedScenario = {
        id,
        userId: SCENARIO_USER_ID,
        name: input.scenarioName,
        createdAt: scenarios.find(item => item.id === id)?.createdAt ?? now,
        updatedAt: now,
        input: { ...input, scenarioId: id, userId: SCENARIO_USER_ID },
        baseline: localSimulation.baseline,
        result: localSimulation.result,
      };
      setScenarios(upsertLocalScenario(scenario));
      setInput(scenario.input);
      setStatus('Scenario saved locally');
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteScenario(scenario: SavedScenario) {
    setScenarios(current => {
      const next = current.filter(item => item.id !== scenario.id);
      saveLocalScenarios(next);
      return next;
    });
    await fetch(`/api/scenarios?scenarioId=${scenario.id}&userId=${SCENARIO_USER_ID}`, { method: 'DELETE' }).catch(() => null);
    setStatus('Scenario deleted');
  }

  function openScenario(scenario: SavedScenario) {
    setInput(scenario.input);
    setSimulation({ baseline: scenario.baseline, result: scenario.result });
    setStatus('Scenario loaded');
  }

  function duplicateScenario(scenario: SavedScenario) {
    setInput({
      ...scenario.input,
      scenarioId: undefined,
      scenarioName: `${scenario.name} copy`,
    });
    setSimulation({ baseline: scenario.baseline, result: scenario.result });
    setStatus('Scenario duplicated');
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-screen)]">
      <AppHeader />
      <main className="flex-1 overflow-auto px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <section className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-fg-muted)]">Scenario Simulator</p>
            <h1 className="text-2xl font-semibold text-[var(--color-fg-default)]">Combined commercial scenario</h1>
            <p className="max-w-3xl text-sm text-[var(--color-fg-muted)]">Model revenue, margin, units, and churn impact from business assumptions, then save scenarios for later comparison.</p>
          </section>

          <section className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
            <form onSubmit={saveScenario} className="rounded-[var(--radii-widget)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-widget)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">Inputs</h2>
                <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-[11px] text-[var(--color-fg-muted)]">{status}</span>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-medium text-[var(--color-fg-muted)]">Scenario name<input value={input.scenarioName} onChange={event => updateField('scenarioName', event.target.value)} className="h-9 rounded border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-screen)] px-3 text-sm text-[var(--color-fg-default)] outline-none focus:border-[var(--color-accent)]" /></label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select label="Business unit" value={input.businessUnit} options={businessUnitOptions} onChange={value => updateField('businessUnit', value)} />
                  <Select label="Country" value={input.country} options={countryOptions} onChange={value => updateField('country', value)} />
                  <Select label="Offering" value={input.product} options={productOptions} onChange={value => updateField('product', value)} />
                  <Select label="Time horizon" value={input.timeHorizon} options={timeHorizonOptions.map(value => ({ value, label: value }))} onChange={value => updateField('timeHorizon', value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Revenue growth %" value={input.revenueGrowthPct} onChange={value => updateField('revenueGrowthPct', value)} />
                  <NumberField label="Price change %" value={input.priceChangePct} onChange={value => updateField('priceChangePct', value)} />
                  <NumberField label="Unit volume %" value={input.unitVolumeChangePct} onChange={value => updateField('unitVolumeChangePct', value)} />
                  <NumberField label="Cost change %" value={input.costChangePct} onChange={value => updateField('costChangePct', value)} />
                  <NumberField label="Churn change %" value={input.churnChangePct} onChange={value => updateField('churnChangePct', value)} />
                  <NumberField label="Margin target %" value={input.marginTargetPct} onChange={value => updateField('marginTargetPct', value)} />
                </div>
                <label className="grid gap-1 text-xs font-medium text-[var(--color-fg-muted)]">Notes<textarea value={input.notes ?? ''} onChange={event => updateField('notes', event.target.value)} rows={3} className="resize-none rounded border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-screen)] px-3 py-2 text-sm text-[var(--color-fg-default)] outline-none focus:border-[var(--color-accent)]" /></label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={isBusy} onClick={() => void runSimulation()} className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-4 text-xs font-semibold text-[var(--color-fg-default)] transition-colors hover:bg-[var(--color-bg-hover)] disabled:opacity-60"><span className="material-symbols-rounded text-[15px]">play_arrow</span>Run</button>
                <button type="submit" disabled={isBusy} className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"><span className="material-symbols-rounded text-[15px]">save</span>Save Scenario</button>
              </div>
            </form>

            <section className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {resultCards.length ? resultCards.map(card => <ResultCard key={card.label} {...card} />) : <div className="rounded-[var(--radii-widget)] bg-[var(--color-bg-card)] p-5 text-sm text-[var(--color-fg-muted)] shadow-[var(--shadow-widget)] md:col-span-2 xl:col-span-4">Run a simulation to see commercial impact, baseline comparison, and recommendation.</div>}
              </div>
              {simulation && (
                <div className="rounded-[var(--radii-widget)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-widget)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">Recommendation</h2>
                    <RiskBadge risk={simulation.result.riskLevel} />
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-fg-default)]">{simulation.result.recommendation}</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <ComparisonBar label="Revenue" baseline={simulation.baseline.revenue} simulated={simulation.result.simulatedRevenue} />
                    <ComparisonBar label="Margin" baseline={simulation.baseline.marginPct} simulated={simulation.result.simulatedMarginPct} suffix="%" />
                  </div>
                </div>
              )}
            </section>
          </section>

          <section className="rounded-[var(--radii-widget)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-widget)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">Saved scenarios</h2>
              <span className="text-xs text-[var(--color-fg-muted)]">{scenarios.length} saved</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="text-xs uppercase text-[var(--color-fg-muted)]">
                  <tr className="border-b border-[var(--color-stroke-subtle)]">
                    <th className="py-2 pr-4 font-semibold">Scenario</th>
                    <th className="py-2 pr-4 font-semibold">Context</th>
                    <th className="py-2 pr-4 font-semibold">Revenue</th>
                    <th className="py-2 pr-4 font-semibold">Margin</th>
                    <th className="py-2 pr-4 font-semibold">Risk</th>
                    <th className="py-2 pr-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map(scenario => (
                    <tr key={scenario.id} className="border-b border-[var(--color-stroke-subtle)] last:border-0">
                      <td className="py-3 pr-4"><div className="font-semibold text-[var(--color-fg-default)]">{scenario.name}</div><div className="text-xs text-[var(--color-fg-muted)]">{new Date(scenario.updatedAt).toLocaleString()}</div></td>
                      <td className="py-3 pr-4 text-[var(--color-fg-muted)]">{labelFor(businessUnitOptions, scenario.input.businessUnit)} · {labelFor(countryOptions, scenario.input.country)} · {scenario.input.timeHorizon}</td>
                      <td className="py-3 pr-4 text-[var(--color-dataviz-positive)]">{formatMoney(scenario.result.simulatedRevenue)}</td>
                      <td className="py-3 pr-4 text-[var(--color-fg-default)]">{scenario.result.simulatedMarginPct.toFixed(1)}%</td>
                      <td className="py-3 pr-4"><RiskBadge risk={scenario.result.riskLevel} /></td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-1">
                          <IconAction icon="edit" label="Open" onClick={() => openScenario(scenario)} />
                          <IconAction icon="content_copy" label="Duplicate" onClick={() => duplicateScenario(scenario)} />
                          <IconAction icon="delete" label="Delete" onClick={() => void deleteScenario(scenario)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!scenarios.length && <tr><td colSpan={6} className="py-8 text-center text-sm text-[var(--color-fg-muted)]">No saved scenarios yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-medium text-[var(--color-fg-muted)]">{label}<select value={value} onChange={event => onChange(event.target.value)} className="h-9 rounded border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-screen)] px-2 text-sm text-[var(--color-fg-default)] outline-none focus:border-[var(--color-accent)]">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="grid gap-1 text-xs font-medium text-[var(--color-fg-muted)]">{label}<input type="number" step="0.1" value={value} onChange={event => onChange(numberValue(event.target.value))} className="h-9 rounded border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-screen)] px-3 text-sm text-[var(--color-fg-default)] outline-none focus:border-[var(--color-accent)]" /></label>;
}

function ResultCard({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: string }) {
  return <div className="rounded-[var(--radii-widget)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-widget)]"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase text-[var(--color-fg-muted)]">{label}</span><span className="material-symbols-rounded text-[18px] text-[var(--color-fg-muted)]">{icon}</span></div><div className="text-2xl font-semibold text-[var(--color-fg-default)]">{value}</div><div className={`mt-1 text-xs font-semibold ${delta.startsWith('-') ? 'text-[var(--color-dataviz-negative)]' : 'text-[var(--color-dataviz-positive)]'}`}>{delta}</div></div>;
}

function RiskBadge({ risk }: { risk: string }) {
  const color = risk === 'High' ? 'var(--color-dataviz-negative)' : risk === 'Medium' ? '#f59e0b' : 'var(--color-dataviz-positive)';
  return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: color }}>{risk}</span>;
}

function ComparisonBar({ label, baseline, simulated, suffix = '' }: { label: string; baseline: number; simulated: number; suffix?: string }) {
  const max = Math.max(baseline, simulated, 1);
  return <div><div className="mb-2 flex justify-between text-xs text-[var(--color-fg-muted)]"><span>{label}</span><span>{baseline.toFixed(1)}{suffix} to {simulated.toFixed(1)}{suffix}</span></div><div className="grid gap-1"><div className="h-2 rounded-full bg-[var(--color-bg-subtle)]"><div className="h-2 rounded-full bg-[var(--color-fg-muted)]" style={{ width: `${baseline / max * 100}%` }} /></div><div className="h-2 rounded-full bg-[var(--color-bg-subtle)]"><div className="h-2 rounded-full bg-[var(--color-accent)]" style={{ width: `${simulated / max * 100}%` }} /></div></div></div>;
}

function IconAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return <button type="button" title={label} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg-default)]"><span className="material-symbols-rounded text-[16px]">{icon}</span></button>;
}

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find(option => option.value === value)?.label ?? value;
}
