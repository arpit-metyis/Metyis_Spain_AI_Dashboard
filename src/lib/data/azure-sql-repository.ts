import type { DashboardTab } from '@/types/dashboard';
import { buildSavedScenario } from '@/lib/scenario-simulator';
import type { DashboardRepository, SavedScenario, ScenarioBaseline, ScenarioInput, ScenarioResult, VisualDataParams } from './types';

type MssqlModule = typeof import('mssql');
type SqlRequest = import('mssql').Request;

interface KpiMetaRow {
  kpi_key: string;
  label: string;
  unit: string | null;
  format: 'currency' | 'percentage' | 'number';
  higher_is_better: boolean;
}

interface KpiFactRow extends KpiMetaRow {
  value: number;
  target: number | null;
  previous_value: number | null;
}

interface KpiPoint {
  key: string;
  label: string;
  value: number;
  target: number;
  previous: number;
  vsTarget: number;
  vsPrevious: number;
  formatted: string;
  formattedDelta: string;
  isPositive: boolean;
}

let poolPromise: Promise<import('mssql').ConnectionPool> | null = null;

function ensureAzureCliOnPath() {
  if (process.platform !== 'win32') return;
  const cliDir = 'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin';
  const pathValue = process.env.PATH ?? '';
  if (!pathValue.toLowerCase().includes(cliDir.toLowerCase())) {
    process.env.PATH = `${pathValue};${cliDir}`;
  }
}

function parseConnectionString(connectionString: string) {
  const entries = new Map<string, string>();
  for (const part of connectionString.split(';')) {
    const [rawKey, ...rawValue] = part.split('=');
    if (!rawKey || rawValue.length === 0) continue;
    entries.set(rawKey.trim().toLowerCase(), rawValue.join('=').trim().replace(/^"|"$/g, ''));
  }
  const rawServer = entries.get('server') ?? entries.get('data source') ?? '';
  const serverWithoutPrefix = rawServer.replace(/^tcp:/i, '');
  const [server, rawPort] = serverWithoutPrefix.split(',');
  return {
    server,
    port: rawPort ? Number(rawPort) : 1433,
    database: entries.get('initial catalog') ?? entries.get('database'),
    encrypt: (entries.get('encrypt') ?? 'true').toLowerCase() === 'true',
    trustServerCertificate: (entries.get('trustservercertificate') ?? 'false').toLowerCase() === 'true',
    connectionTimeout: Number(entries.get('connection timeout') ?? 30) * 1000,
    authentication: entries.get('authentication')?.toLowerCase(),
  };
}

async function getPool() {
  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!connectionString) throw new Error('AZURE_SQL_CONNECTION_STRING is not configured');
  ensureAzureCliOnPath();
  const sql: MssqlModule = await import('mssql');

  if (!poolPromise) {
    const parsed = parseConnectionString(connectionString);
    const useDefaultEntra = parsed.authentication?.includes('active directory default');
    if (useDefaultEntra) {
      poolPromise = sql.connect({
        server: parsed.server,
        port: parsed.port,
        database: parsed.database,
        authentication: {
          type: 'azure-active-directory-default',
          options: process.env.AZURE_CLIENT_ID ? { clientId: process.env.AZURE_CLIENT_ID } : {},
        },
        options: {
          encrypt: parsed.encrypt,
          trustServerCertificate: parsed.trustServerCertificate,
        },
        connectionTimeout: parsed.connectionTimeout,
      } as never);
    } else {
      poolPromise = sql.connect(connectionString);
    }
  }

  return poolPromise;
}

function widgetKpi(params: VisualDataParams): string {
  if (params.widgetType.startsWith('kpi-')) return params.widgetType.replace('kpi-', '');
  return params.kpiKey || 'revenue';
}

function addFilters(request: SqlRequest, params: VisualDataParams) {
  request.input('geo', params.geo ?? null);
  request.input('business_unit_key', params.businessUnit ?? null);
  request.input('product_key', params.product ?? null);
}

function contextPredicate(alias = 's') {
  return `
    and ((@business_unit_key is null and ${alias}.business_unit_key is null) or ${alias}.business_unit_key = @business_unit_key)
    and ((@product_key is null and ${alias}.product_key is null) or ${alias}.product_key = @product_key)
    and (
      @geo is null
      or ${alias}.country_code = @geo
      or exists (
        select 1
        from dim_country geo_country
        where geo_country.country_code = ${alias}.country_code
          and geo_country.region_key = @geo
      )
    )
  `;
}

function aggregateRows(rows: KpiFactRow[]): KpiPoint | null {
  if (rows.length === 0) return null;
  const meta = rows[0];
  const additive = meta.format === 'currency' || ['units', 'pricing', 'pipeline'].includes(meta.kpi_key);
  const divisor = additive ? 1 : rows.length;
  const sum = (selector: (row: KpiFactRow) => number | null) => rows.reduce((total, row) => total + Number(selector(row) ?? 0), 0);
  const precision = meta.format === 'percentage' ? 1 : 0;
  const value = +(sum(row => row.value) / divisor).toFixed(precision);
  const target = +(sum(row => row.target) / divisor).toFixed(precision);
  const previous = +(sum(row => row.previous_value) / divisor).toFixed(precision);
  const vsTarget = target ? +(((value - target) / target) * 100).toFixed(1) : 0;
  const vsPrevious = previous ? +(((value - previous) / previous) * 100).toFixed(1) : 0;
  const isPositive = meta.higher_is_better ? vsTarget >= 0 : vsTarget <= 0;
  return {
    key: meta.kpi_key,
    label: meta.label,
    value,
    target,
    previous,
    vsTarget,
    vsPrevious,
    formatted: formatValue(meta, value),
    formattedDelta: `${vsTarget >= 0 ? '+' : ''}${vsTarget.toFixed(1)}% vs target`,
    isPositive,
  };
}

function formatValue(meta: Pick<KpiMetaRow, 'format' | 'unit' | 'kpi_key'>, value: number) {
  if (meta.format === 'currency') return value >= 1000 ? `${(value / 1000).toFixed(1)}B EUR` : `${value.toFixed(0)} MEUR`;
  if (meta.format === 'percentage') return `${value.toFixed(1)}%`;
  if (meta.kpi_key === 'units') return `${value.toFixed(0)}K`;
  return value.toFixed(0);
}

function rowsMetaHigherBetter(rows: unknown[]): boolean {
  const first = rows[0] as { higher_is_better?: boolean } | undefined;
  return first?.higher_is_better ?? true;
}

function pricingBreakdown(point: KpiPoint) {
  const onPrice = Math.max(45, 72 - point.vsTarget / 2);
  const belowFloor = Math.max(8, 16 + point.vsTarget / 3);
  const aboveCeiling = Math.max(5, 100 - onPrice - belowFloor);
  return [
    { label: 'Below floor', value: +belowFloor.toFixed(1), color: '#dc2626' },
    { label: 'On price', value: +onPrice.toFixed(1), color: '#16a34a' },
    { label: 'Above ceiling', value: +aboveCeiling.toFixed(1), color: '#f59e0b' },
  ];
}

function isoDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function rowToScenario(row: Record<string, unknown>): SavedScenario {
  const id = String(row.scenario_id);
  return {
    id,
    userId: String(row.user_id),
    name: String(row.scenario_name),
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
    input: {
      scenarioId: id,
      scenarioName: String(row.scenario_name),
      userId: String(row.user_id),
      businessUnit: String(row.business_unit_key),
      country: String(row.country_code),
      product: String(row.product_key),
      timeHorizon: String(row.time_horizon),
      revenueGrowthPct: Number(row.revenue_growth_pct),
      priceChangePct: Number(row.price_change_pct),
      unitVolumeChangePct: Number(row.unit_volume_change_pct),
      costChangePct: Number(row.cost_change_pct),
      churnChangePct: Number(row.churn_change_pct),
      marginTargetPct: Number(row.margin_target_pct),
      notes: row.notes ? String(row.notes) : '',
    },
    baseline: {
      revenue: Number(row.baseline_revenue),
      marginPct: Number(row.baseline_margin_pct),
      units: Number(row.baseline_units),
      churnPct: Number(row.baseline_churn_pct),
    },
    result: {
      simulatedRevenue: Number(row.simulated_revenue),
      simulatedMarginPct: Number(row.simulated_margin_pct),
      simulatedUnits: Number(row.simulated_units),
      simulatedChurnPct: Number(row.simulated_churn_pct),
      revenueDelta: Number(row.revenue_delta),
      marginDelta: Number(row.margin_delta),
      riskLevel: String(row.risk_level) as ScenarioResult['riskLevel'],
      recommendation: String(row.recommendation),
    },
  };
}

export class AzureSqlDashboardRepository implements DashboardRepository {
  async getVisualData(params: VisualDataParams): Promise<unknown> {
    if (params.widgetType.startsWith('kpi-')) {
      return { source: 'azure-sql-facts', kind: 'kpi', data: await this.getKpiPoint(widgetKpi(params), params), series: await this.getSeries(widgetKpi(params), params) };
    }

    if (params.widgetType === 'churn-overview') {
      return { source: 'azure-sql-facts', kind: 'churn', churn: await this.getKpiPoint('churn', params), nps: await this.getKpiPoint('nps', params) };
    }

    if (params.widgetType === 'pricing-deviations') {
      const kpi = await this.getKpiPoint('pricing', params);
      return { source: 'azure-sql-facts', kind: 'pricing', kpi, breakdown: pricingBreakdown(kpi) };
    }

    if (params.widgetType === 'performance-map') {
      return { source: 'azure-sql-facts', kind: 'map', kpiKey: widgetKpi(params), rows: await this.getChoropleth(widgetKpi(params), params) };
    }

    if (params.widgetType === 'country-ranking') {
      return { source: 'azure-sql-facts', kind: 'ranking', rows: await this.getRanking(widgetKpi(params), params) };
    }

    if (params.widgetType === 'business-unit-mix') {
      return { source: 'azure-sql-facts', kind: 'mix', rows: await this.getMix('business-unit') };
    }

    if (params.widgetType === 'product-mix') {
      return { source: 'azure-sql-facts', kind: 'mix', rows: await this.getMix('product') };
    }

    if (params.widgetType === 'trend-line') {
      return { source: 'azure-sql-facts', kind: 'series', rows: await this.getSeries(widgetKpi(params), params) };
    }

    if (params.widgetType === 'executive-summary') {
      return { source: 'azure-sql-facts', kind: 'summary', rows: await this.getAllKpis(params) };
    }

    if (params.widgetType === 'target-attainment') {
      const rows = await this.getAllKpis(params);
      return { source: 'azure-sql-facts', kind: 'attainment', rows: rows.map(row => ({ ...row, attainment: row.target ? +(row.value / row.target * 100).toFixed(1) : 0 })) };
    }

    if (params.widgetType === 'risk-alerts') {
      const rows = await this.getAllKpis(params);
      return { source: 'azure-sql-facts', kind: 'risks', rows: rows.filter(row => !row.isPositive).sort((a, b) => a.vsTarget - b.vsTarget) };
    }

    if (params.widgetType === 'business-unit-performance') {
      return { source: 'azure-sql-facts', kind: 'business-unit-performance', rows: await this.getBusinessUnitPerformance(widgetKpi(params), params) };
    }

    return { source: 'azure-sql-facts', kind: 'empty', data: null };
  }

  private async getKpiKeys(): Promise<string[]> {
    const pool = await getPool();
    const result = await pool.request().query('select kpi_key from dim_kpi order by kpi_key');
    return result.recordset.map((row: { kpi_key: string }) => row.kpi_key);
  }

  private async getAllKpis(params: VisualDataParams): Promise<KpiPoint[]> {
    const keys = await this.getKpiKeys();
    const points = await Promise.all(keys.map(key => this.getKpiPoint(key, params)));
    const order = ['revenue', 'margin', 'units', 'churn', 'pricing', 'nps', 'pipeline', 'productivity'];
    return points.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }

  private async getBusinessUnitPerformance(kpiKey: string, params: VisualDataParams) {
    const pool = await getPool();
    const request = pool.request().input('kpi_key', kpiKey).input('geo', params.geo ?? null).input('product_key', params.product ?? null);
    const result = await request.query(`
      select
        b.business_unit_key as unit,
        b.label,
        b.color,
        k.kpi_key,
        k.label as kpi_label,
        k.unit,
        k.format,
        cast(k.higher_is_better as bit) as higher_is_better,
        cast(avg(s.value) as float) as value,
        cast(avg(s.target) as float) as target,
        cast(avg(s.previous_value) as float) as previous_value
      from fact_kpi_snapshot s
      join dim_business_unit b on b.business_unit_key = s.business_unit_key
      join dim_kpi k on k.kpi_key = s.kpi_key
      where s.kpi_key = @kpi_key
        and s.product_key is null
        and s.as_of_date = (select max(as_of_date) from fact_kpi_snapshot where kpi_key = @kpi_key)
        and (@product_key is null or s.product_key = @product_key)
        and (
          @geo is null
          or s.country_code = @geo
          or exists (select 1 from dim_country c where c.country_code = s.country_code and c.region_key = @geo)
        )
      group by b.business_unit_key, b.label, b.color, k.kpi_key, k.label, k.unit, k.format, k.higher_is_better
      order by value desc
    `);
    return (result.recordset as (KpiFactRow & { unit: string; label: string; color: string; kpi_label: string })[])
      .map(row => {
        const point = aggregateRows([{ ...row, label: row.kpi_label }])!;
        return { ...point, unit: row.unit, label: row.label, color: row.color, kpiLabel: point.label };
      });
  }
  private async getKpiRows(kpiKey: string, params: VisualDataParams): Promise<KpiFactRow[]> {
    const pool = await getPool();
    const request = pool.request().input('kpi_key', kpiKey);
    addFilters(request, params);
    const result = await request.query(`
      select
        k.kpi_key,
        k.label,
        k.unit,
        k.format,
        cast(k.higher_is_better as bit) as higher_is_better,
        cast(s.value as float) as value,
        cast(s.target as float) as target,
        cast(s.previous_value as float) as previous_value
      from fact_kpi_snapshot s
      join dim_kpi k on k.kpi_key = s.kpi_key
      where s.kpi_key = @kpi_key
        and s.as_of_date = (select max(as_of_date) from fact_kpi_snapshot where kpi_key = @kpi_key)
        ${contextPredicate('s')}
    `);
    return result.recordset as KpiFactRow[];
  }

  private async getKpiPoint(kpiKey: string, params: VisualDataParams): Promise<KpiPoint> {
    let rows = await this.getKpiRows(kpiKey, params);
    if (rows.length === 0 && (params.businessUnit || params.product)) {
      rows = await this.getKpiRows(kpiKey, { ...params, businessUnit: null, product: null });
    }
    const point = aggregateRows(rows);
    if (!point) throw new Error(`No KPI snapshot data found for ${kpiKey}`);
    return point;
  }

  private async getRanking(kpiKey: string, params: VisualDataParams) {
    const pool = await getPool();
    const request = pool.request().input('kpi_key', kpiKey);
    addFilters(request, { ...params, geo: null });
    const result = await request.query(`
      select
        c.country_code as code,
        c.country_name as name,
        k.kpi_key,
        k.label,
        k.unit,
        k.format,
        cast(k.higher_is_better as bit) as higher_is_better,
        cast(s.value as float) as value,
        cast(s.target as float) as target,
        cast(s.previous_value as float) as previous_value
      from fact_kpi_snapshot s
      join dim_country c on c.country_code = s.country_code
      join dim_kpi k on k.kpi_key = s.kpi_key
      where s.kpi_key = @kpi_key
        and s.as_of_date = (select max(as_of_date) from fact_kpi_snapshot where kpi_key = @kpi_key)
        and ((@business_unit_key is null and s.business_unit_key is null) or s.business_unit_key = @business_unit_key)
        and ((@product_key is null and s.product_key is null) or s.product_key = @product_key)
    `);

    const rows = (result.recordset as (KpiFactRow & { code: string; name: string })[])
      .map(row => ({ code: row.code.trim(), name: row.name, ...aggregateRows([row])! }))
      .sort((a, b) => rowsMetaHigherBetter(result.recordset) ? b.value - a.value : a.value - b.value)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    return rows;
  }

  private async getChoropleth(kpiKey: string, params: VisualDataParams) {
    const rows = await this.getRanking(kpiKey, params);
    const scores = rows.map(row => row.isPositive ? row.vsTarget : -row.vsTarget);
    const min = Math.min(...scores, 0);
    const max = Math.max(...scores, 1);
    const range = max - min || 1;
    return rows.map((row, index) => ({
      code: row.code,
      name: row.name,
      value: (scores[index] - min) / range,
      formatted: row.formatted,
      isPositive: row.isPositive,
    }));
  }

  private async getSeries(kpiKey: string, params: VisualDataParams) {
    const pool = await getPool();
    const request = pool.request().input('kpi_key', kpiKey);
    addFilters(request, params);
    const result = await request.query(`
      select
        convert(char(7), t.period_start, 126) as period,
        cast(avg(t.value) as float) as value,
        cast(avg(t.target) as float) as target
      from fact_kpi_timeseries t
      where t.kpi_key = @kpi_key
        ${contextPredicate('t')}
      group by convert(char(7), t.period_start, 126), t.period_start
      order by t.period_start
    `);
    return result.recordset;
  }

  private async getMix(kind: 'business-unit' | 'product') {
    const pool = await getPool();
    const result = await pool.request().input('mix_type', kind).query(`
      select
        m.item_key as [key],
        coalesce(b.label, p.label, m.item_key) as label,
        coalesce(b.color, p.color, '#64748b') as color,
        cast(m.value as float) as value,
        cast(m.percentage as float) as pct
      from fact_mix_distribution m
      left join dim_business_unit b on b.business_unit_key = m.item_key and m.mix_type = 'business-unit'
      left join dim_product p on p.product_key = m.item_key and m.mix_type = 'product'
      where m.mix_type = @mix_type
        and m.as_of_date = (select max(as_of_date) from fact_mix_distribution where mix_type = @mix_type)
      order by m.value desc
    `);
    return result.recordset;
  }


  async getDashboardLayout(dashboardId: string): Promise<{ tabs: DashboardTab[]; updatedAt?: string } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('dashboard_id', dashboardId)
      .query(`
        select top 1 layout_json, updated_at
        from app_dashboard_layout
        where dashboard_id = @dashboard_id
      `);
    const row = result.recordset[0];
    if (!row?.layout_json) return null;
    return {
      tabs: typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }
  async saveDashboardLayout(dashboardId: string, tabs: DashboardTab[]): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('dashboard_id', dashboardId)
      .input('layout_json', JSON.stringify(tabs))
      .query(`
        merge app_dashboard_layout as target
        using (select @dashboard_id as dashboard_id) as source
        on target.dashboard_id = source.dashboard_id
        when matched then update set layout_json = @layout_json, updated_at = sysutcdatetime()
        when not matched then insert (dashboard_id, layout_json) values (@dashboard_id, @layout_json);
      `);
  }

  async getScenarioBaseline(input: ScenarioInput): Promise<ScenarioBaseline> {
    const params: VisualDataParams = {
      widgetType: 'scenario-baseline',
      geo: input.country,
      businessUnit: input.businessUnit,
      product: input.product,
      timeframe: input.timeHorizon,
    };
    const [revenue, margin, units, churn] = await Promise.all([
      this.getKpiPoint('revenue', params),
      this.getKpiPoint('margin', params),
      this.getKpiPoint('units', params),
      this.getKpiPoint('churn', params),
    ]);
    return {
      revenue: revenue.value,
      marginPct: margin.value,
      units: units.value,
      churnPct: churn.value,
    };
  }

  async listScenarios(userId: string): Promise<SavedScenario[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', userId)
      .query(`
        select
          s.scenario_id,
          s.user_id,
          s.scenario_name,
          s.created_at,
          s.updated_at,
          i.business_unit_key,
          i.country_code,
          i.product_key,
          i.time_horizon,
          cast(i.revenue_growth_pct as float) as revenue_growth_pct,
          cast(i.price_change_pct as float) as price_change_pct,
          cast(i.unit_volume_change_pct as float) as unit_volume_change_pct,
          cast(i.cost_change_pct as float) as cost_change_pct,
          cast(i.churn_change_pct as float) as churn_change_pct,
          cast(i.margin_target_pct as float) as margin_target_pct,
          i.notes,
          cast(r.baseline_revenue as float) as baseline_revenue,
          cast(r.baseline_margin_pct as float) as baseline_margin_pct,
          cast(r.baseline_units as float) as baseline_units,
          cast(r.baseline_churn_pct as float) as baseline_churn_pct,
          cast(r.simulated_revenue as float) as simulated_revenue,
          cast(r.simulated_margin_pct as float) as simulated_margin_pct,
          cast(r.simulated_units as float) as simulated_units,
          cast(r.simulated_churn_pct as float) as simulated_churn_pct,
          cast(r.revenue_delta as float) as revenue_delta,
          cast(r.margin_delta as float) as margin_delta,
          r.risk_level,
          r.recommendation
        from scenario s
        join scenario_input i on i.scenario_id = s.scenario_id
        join scenario_result r on r.scenario_id = s.scenario_id
        where s.user_id = @user_id
        order by s.updated_at desc
      `);
    return result.recordset.map(rowToScenario);
  }

  async saveScenario(input: ScenarioInput, baseline: ScenarioBaseline, result: ScenarioResult): Promise<SavedScenario> {
    const pool = await getPool();
    const saved = buildSavedScenario(input, baseline, result);
    await pool.request()
      .input('scenario_id', saved.id)
      .input('user_id', saved.userId)
      .input('scenario_name', saved.name)
      .input('business_unit_key', saved.input.businessUnit)
      .input('country_code', saved.input.country)
      .input('product_key', saved.input.product)
      .input('time_horizon', saved.input.timeHorizon)
      .input('revenue_growth_pct', saved.input.revenueGrowthPct)
      .input('price_change_pct', saved.input.priceChangePct)
      .input('unit_volume_change_pct', saved.input.unitVolumeChangePct)
      .input('cost_change_pct', saved.input.costChangePct)
      .input('churn_change_pct', saved.input.churnChangePct)
      .input('margin_target_pct', saved.input.marginTargetPct)
      .input('notes', saved.input.notes ?? null)
      .input('baseline_revenue', saved.baseline.revenue)
      .input('baseline_margin_pct', saved.baseline.marginPct)
      .input('baseline_units', saved.baseline.units)
      .input('baseline_churn_pct', saved.baseline.churnPct)
      .input('simulated_revenue', saved.result.simulatedRevenue)
      .input('simulated_margin_pct', saved.result.simulatedMarginPct)
      .input('simulated_units', saved.result.simulatedUnits)
      .input('simulated_churn_pct', saved.result.simulatedChurnPct)
      .input('revenue_delta', saved.result.revenueDelta)
      .input('margin_delta', saved.result.marginDelta)
      .input('risk_level', saved.result.riskLevel)
      .input('recommendation', saved.result.recommendation)
      .query(`
        merge scenario as target
        using (select @scenario_id as scenario_id) as source
        on target.scenario_id = source.scenario_id
        when matched then update set scenario_name = @scenario_name, user_id = @user_id, updated_at = sysutcdatetime()
        when not matched then insert (scenario_id, user_id, scenario_name) values (@scenario_id, @user_id, @scenario_name);

        merge scenario_input as target
        using (select @scenario_id as scenario_id) as source
        on target.scenario_id = source.scenario_id
        when matched then update set
          business_unit_key = @business_unit_key,
          country_code = @country_code,
          product_key = @product_key,
          time_horizon = @time_horizon,
          revenue_growth_pct = @revenue_growth_pct,
          price_change_pct = @price_change_pct,
          unit_volume_change_pct = @unit_volume_change_pct,
          cost_change_pct = @cost_change_pct,
          churn_change_pct = @churn_change_pct,
          margin_target_pct = @margin_target_pct,
          notes = @notes
        when not matched then insert (
          scenario_id, business_unit_key, country_code, product_key, time_horizon,
          revenue_growth_pct, price_change_pct, unit_volume_change_pct, cost_change_pct,
          churn_change_pct, margin_target_pct, notes
        ) values (
          @scenario_id, @business_unit_key, @country_code, @product_key, @time_horizon,
          @revenue_growth_pct, @price_change_pct, @unit_volume_change_pct, @cost_change_pct,
          @churn_change_pct, @margin_target_pct, @notes
        );

        merge scenario_result as target
        using (select @scenario_id as scenario_id) as source
        on target.scenario_id = source.scenario_id
        when matched then update set
          baseline_revenue = @baseline_revenue,
          baseline_margin_pct = @baseline_margin_pct,
          baseline_units = @baseline_units,
          baseline_churn_pct = @baseline_churn_pct,
          simulated_revenue = @simulated_revenue,
          simulated_margin_pct = @simulated_margin_pct,
          simulated_units = @simulated_units,
          simulated_churn_pct = @simulated_churn_pct,
          revenue_delta = @revenue_delta,
          margin_delta = @margin_delta,
          risk_level = @risk_level,
          recommendation = @recommendation
        when not matched then insert (
          scenario_id, baseline_revenue, baseline_margin_pct, baseline_units, baseline_churn_pct,
          simulated_revenue, simulated_margin_pct, simulated_units, simulated_churn_pct,
          revenue_delta, margin_delta, risk_level, recommendation
        ) values (
          @scenario_id, @baseline_revenue, @baseline_margin_pct, @baseline_units, @baseline_churn_pct,
          @simulated_revenue, @simulated_margin_pct, @simulated_units, @simulated_churn_pct,
          @revenue_delta, @margin_delta, @risk_level, @recommendation
        );
      `);
    return { ...saved, updatedAt: new Date().toISOString() };
  }

  async deleteScenario(scenarioId: string, userId: string): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('scenario_id', scenarioId)
      .input('user_id', userId)
      .query(`
        delete r from scenario_result r join scenario s on s.scenario_id = r.scenario_id where s.scenario_id = @scenario_id and s.user_id = @user_id;
        delete i from scenario_input i join scenario s on s.scenario_id = i.scenario_id where s.scenario_id = @scenario_id and s.user_id = @user_id;
        delete from scenario where scenario_id = @scenario_id and user_id = @user_id;
      `);
  }

  async getHealth() {
    const pool = await getPool();
    const result = await pool.request().query(`
      select
        (select count(*) from dim_kpi) as kpis,
        (select count(*) from fact_kpi_snapshot) as snapshots,
        (select count(*) from fact_kpi_timeseries) as timeseries,
        (select count(*) from fact_mix_distribution) as mix_rows
    `);
    return { source: 'azure-sql-facts', ok: true, detail: result.recordset[0] };
  }
}
