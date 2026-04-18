-- Metyis Spain AI Dashboard - Azure SQL schema
-- Run against Azure SQL Database: metyis-es-genai-app-database

create table dim_kpi (
  kpi_key nvarchar(64) not null primary key,
  label nvarchar(128) not null,
  unit nvarchar(32) null,
  format nvarchar(32) not null,
  higher_is_better bit not null
);

go

create table dim_region (
  region_key nvarchar(64) not null primary key,
  label nvarchar(128) not null
);

go

create table dim_country (
  country_code nchar(2) not null primary key,
  country_name nvarchar(128) not null,
  region_key nvarchar(64) not null references dim_region(region_key)
);

go

create table dim_business_unit (
  business_unit_key nvarchar(64) not null primary key,
  label nvarchar(128) not null,
  color nvarchar(16) null
);

go

create table dim_product (
  product_key nvarchar(64) not null primary key,
  label nvarchar(128) not null,
  color nvarchar(16) null
);

go

create table fact_kpi_snapshot (
  snapshot_id bigint identity(1,1) not null primary key,
  as_of_date date not null,
  kpi_key nvarchar(64) not null references dim_kpi(kpi_key),
  country_code nchar(2) null references dim_country(country_code),
  business_unit_key nvarchar(64) null references dim_business_unit(business_unit_key),
  product_key nvarchar(64) null references dim_product(product_key),
  value decimal(18,4) not null,
  target decimal(18,4) null,
  previous_value decimal(18,4) null
);

go

create table fact_kpi_timeseries (
  series_id bigint identity(1,1) not null primary key,
  period_start date not null,
  kpi_key nvarchar(64) not null references dim_kpi(kpi_key),
  country_code nchar(2) null references dim_country(country_code),
  business_unit_key nvarchar(64) null references dim_business_unit(business_unit_key),
  product_key nvarchar(64) null references dim_product(product_key),
  value decimal(18,4) not null,
  target decimal(18,4) null
);

go

create table fact_ranking (
  ranking_id bigint identity(1,1) not null primary key,
  as_of_date date not null,
  kpi_key nvarchar(64) not null references dim_kpi(kpi_key),
  country_code nchar(2) not null references dim_country(country_code),
  rank_no int not null,
  value decimal(18,4) not null
);

go

create table fact_mix_distribution (
  mix_id bigint identity(1,1) not null primary key,
  as_of_date date not null,
  mix_type nvarchar(32) not null check (mix_type in ('business-unit', 'product')),
  item_key nvarchar(64) not null,
  value decimal(18,4) not null,
  percentage decimal(9,4) not null
);

go

create table app_visual_data (
  visual_data_id bigint identity(1,1) not null primary key,
  widget_type nvarchar(128) not null,
  kpi_key nvarchar(64) null,
  payload_json nvarchar(max) not null check (isjson(payload_json) = 1),
  updated_at datetime2 not null default sysutcdatetime()
);

go

create table app_dashboard_layout (
  dashboard_id nvarchar(128) not null primary key,
  layout_json nvarchar(max) not null check (isjson(layout_json) = 1),
  updated_at datetime2 not null default sysutcdatetime()
);

go

create table scenario (
  scenario_id nvarchar(128) not null primary key,
  user_id nvarchar(128) not null,
  scenario_name nvarchar(256) not null,
  created_at datetime2 not null default sysutcdatetime(),
  updated_at datetime2 not null default sysutcdatetime()
);

go

create table scenario_input (
  scenario_id nvarchar(128) not null primary key references scenario(scenario_id),
  business_unit_key nvarchar(64) not null references dim_business_unit(business_unit_key),
  country_code nchar(2) not null references dim_country(country_code),
  product_key nvarchar(64) not null references dim_product(product_key),
  time_horizon nvarchar(64) not null,
  revenue_growth_pct decimal(9,4) not null,
  price_change_pct decimal(9,4) not null,
  unit_volume_change_pct decimal(9,4) not null,
  cost_change_pct decimal(9,4) not null,
  churn_change_pct decimal(9,4) not null,
  margin_target_pct decimal(9,4) not null,
  notes nvarchar(max) null
);

go

create table scenario_result (
  scenario_id nvarchar(128) not null primary key references scenario(scenario_id),
  baseline_revenue decimal(18,4) not null,
  baseline_margin_pct decimal(9,4) not null,
  baseline_units decimal(18,4) not null,
  baseline_churn_pct decimal(9,4) not null,
  simulated_revenue decimal(18,4) not null,
  simulated_margin_pct decimal(9,4) not null,
  simulated_units decimal(18,4) not null,
  simulated_churn_pct decimal(9,4) not null,
  revenue_delta decimal(18,4) not null,
  margin_delta decimal(9,4) not null,
  risk_level nvarchar(16) not null check (risk_level in ('Low', 'Medium', 'High')),
  recommendation nvarchar(max) not null
);

go

create index ix_fact_kpi_snapshot_lookup on fact_kpi_snapshot(kpi_key, country_code, business_unit_key, product_key, as_of_date);
create index ix_fact_kpi_timeseries_lookup on fact_kpi_timeseries(kpi_key, country_code, business_unit_key, product_key, period_start);
create index ix_app_visual_data_lookup on app_visual_data(widget_type, kpi_key, updated_at desc);
create index ix_scenario_user_updated on scenario(user_id, updated_at desc);
