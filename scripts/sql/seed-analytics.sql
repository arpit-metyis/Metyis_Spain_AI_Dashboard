-- Metyis Spain AI Dashboard - full demo seed data
-- Safe to rerun. Populates dimensions plus enough facts for KPI cards, trends, maps, rankings, and mix widgets.

set nocount on;

-- Clear facts first because they reference dimensions.
delete from fact_ranking;
delete from fact_mix_distribution;
delete from fact_kpi_timeseries;
delete from fact_kpi_snapshot;

-- Upsert KPI dimension.
merge dim_kpi as target
using (values
  ('revenue',       'Revenue',            'MEUR', 'currency',   cast(1 as bit)),
  ('margin',        'Margin',             '%',    'percentage', cast(1 as bit)),
  ('units',         'Units',              'K',    'number',     cast(1 as bit)),
  ('churn',         'Churn',              '%',    'percentage', cast(0 as bit)),
  ('pricing',       'Pricing Deviations', '',     'number',     cast(0 as bit)),
  ('nps',           'NPS',                'pts',  'number',     cast(1 as bit)),
  ('pipeline',      'Pipeline',           'MEUR', 'currency',   cast(1 as bit)),
  ('productivity',  'Productivity',       '%',    'percentage', cast(1 as bit))
) as source(kpi_key, label, unit, format, higher_is_better)
on target.kpi_key = source.kpi_key
when matched then update set label = source.label, unit = source.unit, format = source.format, higher_is_better = source.higher_is_better
when not matched then insert (kpi_key, label, unit, format, higher_is_better) values (source.kpi_key, source.label, source.unit, source.format, source.higher_is_better);

-- Upsert geography dimensions.
merge dim_region as target
using (values
  ('iberia', 'Iberia'),
  ('western-europe', 'Western Europe'),
  ('southern-europe', 'Southern Europe'),
  ('americas', 'Americas'),
  ('apac', 'APAC')
) as source(region_key, label)
on target.region_key = source.region_key
when matched then update set label = source.label
when not matched then insert (region_key, label) values (source.region_key, source.label);

merge dim_country as target
using (values
  ('ES', 'Spain', 'iberia'),
  ('PT', 'Portugal', 'iberia'),
  ('FR', 'France', 'western-europe'),
  ('DE', 'Germany', 'western-europe'),
  ('NL', 'Netherlands', 'western-europe'),
  ('GB', 'United Kingdom', 'western-europe'),
  ('IT', 'Italy', 'southern-europe'),
  ('GR', 'Greece', 'southern-europe'),
  ('TR', 'Turkey', 'southern-europe'),
  ('US', 'United States', 'americas'),
  ('BR', 'Brazil', 'americas'),
  ('MX', 'Mexico', 'americas'),
  ('CN', 'China', 'apac'),
  ('IN', 'India', 'apac'),
  ('SG', 'Singapore', 'apac'),
  ('AU', 'Australia', 'apac')
) as source(country_code, country_name, region_key)
on target.country_code = source.country_code
when matched then update set country_name = source.country_name, region_key = source.region_key
when not matched then insert (country_code, country_name, region_key) values (source.country_code, source.country_name, source.region_key);

-- Upsert business dimensions.
merge dim_business_unit as target
using (values
  ('strategy',   'Strategy & Transformation', '#26547c'),
  ('data-ai',    'Data & AI',                  '#06a77d'),
  ('digital',    'Digital Commerce',           '#ef476f'),
  ('operations', 'Operations',                 '#ffd166'),
  ('finance',    'Finance & Performance',      '#7b2cbf')
) as source(business_unit_key, label, color)
on target.business_unit_key = source.business_unit_key
when matched then update set label = source.label, color = source.color
when not matched then insert (business_unit_key, label, color) values (source.business_unit_key, source.label, source.color);

merge dim_product as target
using (values
  ('advisory',         'Advisory',            '#2563eb'),
  ('analytics',        'Analytics Products',  '#16a34a'),
  ('managed-services', 'Managed Services',    '#f97316'),
  ('platforms',        'Platforms',           '#9333ea'),
  ('implementation',   'Implementation',      '#dc2626')
) as source(product_key, label, color)
on target.product_key = source.product_key
when matched then update set label = source.label, color = source.color
when not matched then insert (product_key, label, color) values (source.product_key, source.label, source.color);

declare @as_of_date date = cast(getdate() as date);

-- Contexts include global, business-unit, offering, and business-unit + offering combinations.
;with country_factors as (
  select
    country_code,
    row_number() over (order by country_code) as rn,
    cast(0.35 + row_number() over (order by country_code) * 0.055 as decimal(18,6)) as country_factor
  from dim_country
), business_unit_context as (
  select cast(null as nvarchar(64)) as business_unit_key, cast(1.000 as decimal(18,6)) as bu_factor
  union all select 'strategy',   cast(0.95 as decimal(18,6))
  union all select 'data-ai',    cast(1.22 as decimal(18,6))
  union all select 'digital',    cast(0.88 as decimal(18,6))
  union all select 'operations', cast(0.78 as decimal(18,6))
  union all select 'finance',    cast(0.70 as decimal(18,6))
), product_context as (
  select cast(null as nvarchar(64)) as product_key, cast(1.000 as decimal(18,6)) as product_factor
  union all select 'advisory',         cast(0.92 as decimal(18,6))
  union all select 'analytics',        cast(1.16 as decimal(18,6))
  union all select 'managed-services', cast(1.02 as decimal(18,6))
  union all select 'platforms',        cast(0.84 as decimal(18,6))
  union all select 'implementation',   cast(0.74 as decimal(18,6))
), base_kpis as (
  select * from (values
    ('revenue',       cast(118.0 as decimal(18,4)), cast(112.0 as decimal(18,4)), cast(104.0 as decimal(18,4))),
    ('margin',        cast(28.4  as decimal(18,4)), cast(27.0  as decimal(18,4)), cast(25.8  as decimal(18,4))),
    ('units',         cast(18.0  as decimal(18,4)), cast(17.0  as decimal(18,4)), cast(16.0  as decimal(18,4))),
    ('churn',         cast(4.7   as decimal(18,4)), cast(5.0   as decimal(18,4)), cast(5.8   as decimal(18,4))),
    ('pricing',       cast(42.0  as decimal(18,4)), cast(39.0  as decimal(18,4)), cast(51.0  as decimal(18,4))),
    ('nps',           cast(52.0  as decimal(18,4)), cast(48.0  as decimal(18,4)), cast(45.0  as decimal(18,4))),
    ('pipeline',      cast(86.0  as decimal(18,4)), cast(82.0  as decimal(18,4)), cast(76.0  as decimal(18,4))),
    ('productivity',  cast(82.5  as decimal(18,4)), cast(80.0  as decimal(18,4)), cast(78.4  as decimal(18,4)))
  ) as v(kpi_key, base_value, base_target, base_previous)
)
insert into fact_kpi_snapshot (as_of_date, kpi_key, country_code, business_unit_key, product_key, value, target, previous_value)
select
  @as_of_date,
  k.kpi_key,
  c.country_code,
  bu.business_unit_key,
  p.product_key,
  case
    when k.kpi_key in ('margin', 'churn', 'nps', 'productivity') then
      k.base_value
      + ((c.rn % 5) - 2) * case when k.kpi_key = 'nps' then 2.0 else 0.7 end
      + case when bu.business_unit_key is null then 0 else (bu.bu_factor - 1.0) * case when k.kpi_key = 'nps' then 10.0 else 4.0 end end
      + case when p.product_key is null then 0 else (p.product_factor - 1.0) * case when k.kpi_key = 'nps' then 8.0 else 3.0 end end
    else k.base_value * c.country_factor * bu.bu_factor * p.product_factor
  end as value,
  case
    when k.kpi_key in ('margin', 'churn', 'nps', 'productivity') then
      k.base_target + ((c.rn % 4) - 1) * case when k.kpi_key = 'nps' then 1.5 else 0.4 end
    else k.base_target * c.country_factor * bu.bu_factor * p.product_factor
  end as target,
  case
    when k.kpi_key in ('margin', 'churn', 'nps', 'productivity') then
      k.base_previous + ((c.rn % 6) - 2) * case when k.kpi_key = 'nps' then 1.8 else 0.5 end
    else k.base_previous * c.country_factor * bu.bu_factor * p.product_factor
  end as previous_value
from base_kpis k
cross join country_factors c
cross join business_unit_context bu
cross join product_context p;

-- 12 months of time-series data for every seeded context.
;with months as (
  select * from (values (11),(10),(9),(8),(7),(6),(5),(4),(3),(2),(1),(0)) as v(month_offset)
), country_factors as (
  select
    country_code,
    row_number() over (order by country_code) as rn,
    cast(0.35 + row_number() over (order by country_code) * 0.055 as decimal(18,6)) as country_factor
  from dim_country
), business_unit_context as (
  select cast(null as nvarchar(64)) as business_unit_key, cast(1.000 as decimal(18,6)) as bu_factor
  union all select 'strategy',   cast(0.95 as decimal(18,6))
  union all select 'data-ai',    cast(1.22 as decimal(18,6))
  union all select 'digital',    cast(0.88 as decimal(18,6))
  union all select 'operations', cast(0.78 as decimal(18,6))
  union all select 'finance',    cast(0.70 as decimal(18,6))
), product_context as (
  select cast(null as nvarchar(64)) as product_key, cast(1.000 as decimal(18,6)) as product_factor
  union all select 'advisory',         cast(0.92 as decimal(18,6))
  union all select 'analytics',        cast(1.16 as decimal(18,6))
  union all select 'managed-services', cast(1.02 as decimal(18,6))
  union all select 'platforms',        cast(0.84 as decimal(18,6))
  union all select 'implementation',   cast(0.74 as decimal(18,6))
), base_kpis as (
  select * from (values
    ('revenue',       cast(118.0 as decimal(18,4)), cast(112.0 as decimal(18,4))),
    ('margin',        cast(28.4  as decimal(18,4)), cast(27.0  as decimal(18,4))),
    ('units',         cast(18.0  as decimal(18,4)), cast(17.0  as decimal(18,4))),
    ('churn',         cast(4.7   as decimal(18,4)), cast(5.0   as decimal(18,4))),
    ('pricing',       cast(42.0  as decimal(18,4)), cast(39.0  as decimal(18,4))),
    ('nps',           cast(52.0  as decimal(18,4)), cast(48.0  as decimal(18,4))),
    ('pipeline',      cast(86.0  as decimal(18,4)), cast(82.0  as decimal(18,4))),
    ('productivity',  cast(82.5  as decimal(18,4)), cast(80.0  as decimal(18,4)))
  ) as v(kpi_key, base_value, base_target)
)
insert into fact_kpi_timeseries (period_start, kpi_key, country_code, business_unit_key, product_key, value, target)
select
  datefromparts(year(dateadd(month, -m.month_offset, @as_of_date)), month(dateadd(month, -m.month_offset, @as_of_date)), 1),
  k.kpi_key,
  c.country_code,
  bu.business_unit_key,
  p.product_key,
  case
    when k.kpi_key in ('margin', 'churn', 'nps', 'productivity') then
      k.base_value
      + ((c.rn % 5) - 2) * 0.5
      + (11 - m.month_offset) * case when k.kpi_key = 'churn' then -0.04 else 0.05 end
      + case when bu.business_unit_key is null then 0 else (bu.bu_factor - 1.0) * 3.0 end
      + case when p.product_key is null then 0 else (p.product_factor - 1.0) * 2.5 end
    else k.base_value * c.country_factor * bu.bu_factor * p.product_factor * (0.88 + (11 - m.month_offset) * 0.012)
  end as value,
  case
    when k.kpi_key in ('margin', 'churn', 'nps', 'productivity') then k.base_target + ((c.rn % 4) - 1) * 0.25
    else k.base_target * c.country_factor * bu.bu_factor * p.product_factor
  end as target
from base_kpis k
cross join country_factors c
cross join business_unit_context bu
cross join product_context p
cross join months m;

-- Mix widgets.
insert into fact_mix_distribution (as_of_date, mix_type, item_key, value, percentage)
select @as_of_date, 'business-unit', item_key, value, value * 100.0 / sum(value) over ()
from (values
  ('strategy',   cast(285 as decimal(18,4))),
  ('data-ai',    cast(340 as decimal(18,4))),
  ('digital',    cast(225 as decimal(18,4))),
  ('operations', cast(190 as decimal(18,4))),
  ('finance',    cast(160 as decimal(18,4)))
) as v(item_key, value);

insert into fact_mix_distribution (as_of_date, mix_type, item_key, value, percentage)
select @as_of_date, 'product', item_key, value, value * 100.0 / sum(value) over ()
from (values
  ('advisory',         cast(260 as decimal(18,4))),
  ('analytics',        cast(310 as decimal(18,4))),
  ('managed-services', cast(245 as decimal(18,4))),
  ('platforms',        cast(210 as decimal(18,4))),
  ('implementation',   cast(175 as decimal(18,4)))
) as v(item_key, value);

-- Ranking table for the global context.
insert into fact_ranking (as_of_date, kpi_key, country_code, rank_no, value)
select
  s.as_of_date,
  s.kpi_key,
  s.country_code,
  row_number() over (
    partition by s.kpi_key
    order by case when k.higher_is_better = 1 then s.value end desc,
             case when k.higher_is_better = 0 then s.value end asc
  ) as rank_no,
  s.value
from fact_kpi_snapshot s
join dim_kpi k on k.kpi_key = s.kpi_key
where s.as_of_date = @as_of_date
  and s.country_code is not null
  and s.business_unit_key is null
  and s.product_key is null;

-- Sample Scenario Simulator records.
delete from scenario_result where scenario_id in ('sample-growth-upside', 'sample-margin-protection', 'sample-retention-push');
delete from scenario_input where scenario_id in ('sample-growth-upside', 'sample-margin-protection', 'sample-retention-push');
delete from scenario where scenario_id in ('sample-growth-upside', 'sample-margin-protection', 'sample-retention-push');

insert into scenario (scenario_id, user_id, scenario_name)
values
  ('sample-growth-upside', 'demo-user', 'Spain analytics growth upside'),
  ('sample-margin-protection', 'demo-user', 'Portugal margin protection'),
  ('sample-retention-push', 'demo-user', 'Netherlands retention push');

insert into scenario_input (
  scenario_id, business_unit_key, country_code, product_key, time_horizon,
  revenue_growth_pct, price_change_pct, unit_volume_change_pct, cost_change_pct,
  churn_change_pct, margin_target_pct, notes
)
values
  ('sample-growth-upside', 'data-ai', 'ES', 'analytics', 'Next Quarter', 5.0, 1.5, 2.5, 0.8, -0.4, 30.0, 'Upside case for analytics-led growth in Spain.'),
  ('sample-margin-protection', 'operations', 'PT', 'managed-services', 'Next 6 Months', 1.5, 2.0, -0.5, -1.2, -0.2, 27.0, 'Protect delivery margin with pricing and cost action.'),
  ('sample-retention-push', 'strategy', 'NL', 'advisory', 'FY 2026', 3.0, 0.5, 1.0, 0.4, -1.1, 29.0, 'Retention program to reduce churn while preserving advisory growth.');

insert into scenario_result (
  scenario_id, baseline_revenue, baseline_margin_pct, baseline_units, baseline_churn_pct,
  simulated_revenue, simulated_margin_pct, simulated_units, simulated_churn_pct,
  revenue_delta, margin_delta, risk_level, recommendation
)
values
  ('sample-growth-upside', 315.0, 27.8, 48.0, 4.2, 343.4, 28.8, 49.0, 3.8, 28.4, 1.0, 'Low', 'Low-risk scenario: growth assumptions show positive revenue movement with manageable margin impact.'),
  ('sample-margin-protection', 178.0, 25.4, 29.0, 4.8, 183.3, 26.6, 29.0, 4.6, 5.3, 1.2, 'Low', 'Low-risk scenario: pricing and cost controls improve margin while preserving revenue.'),
  ('sample-retention-push', 169.0, 29.1, 24.0, 3.7, 176.6, 29.2, 24.0, 2.6, 7.6, 0.1, 'Medium', 'Moderate-risk scenario: retention improves churn, but margin needs close tracking during execution.');

select
  (select count(*) from dim_kpi) as kpi_rows,
  (select count(*) from dim_country) as country_rows,
  (select count(*) from fact_kpi_snapshot) as snapshot_rows,
  (select count(*) from fact_kpi_timeseries) as timeseries_rows,
  (select count(*) from fact_mix_distribution) as mix_rows,
  (select count(*) from fact_ranking) as ranking_rows,
  (select count(*) from scenario) as scenario_rows;
