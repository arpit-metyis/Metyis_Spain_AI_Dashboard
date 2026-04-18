-- Metyis Spain AI Dashboard - Scenario Simulator tables
-- Run this against an existing database that already has the main dashboard schema.

if object_id('scenario', 'U') is null
begin
  create table scenario (
    scenario_id nvarchar(128) not null primary key,
    user_id nvarchar(128) not null,
    scenario_name nvarchar(256) not null,
    created_at datetime2 not null default sysutcdatetime(),
    updated_at datetime2 not null default sysutcdatetime()
  );
end;

if object_id('scenario_input', 'U') is null
begin
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
end;

if object_id('scenario_result', 'U') is null
begin
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
end;

if not exists (select 1 from sys.indexes where name = 'ix_scenario_user_updated' and object_id = object_id('scenario'))
begin
  create index ix_scenario_user_updated on scenario(user_id, updated_at desc);
end;
