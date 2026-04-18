# Metyis Spain AI Dashboard

A generic consulting and business analytics Control Tower for Metyis Spain. The app keeps the reusable dashboard functionality from the prototype: a draggable/resizable widget grid, global filters, a widget gallery, theme support, mock authentication, and an AI assistant panel.

## What is included

- One dashboard: **Control Tower**
- Direct landing at `/` after login
- Alias route at `/dashboard/control-tower`
- Generic KPIs: Revenue, Margin, Units, Churn, Pricing Deviations, NPS, Pipeline, Productivity
- Internal API route for widget data: `/api/visual-data`
- Repository abstraction with Azure SQL fact-table support and deterministic mock fallback
- Dashboard layout persistence API: `/api/dashboard/layout`
- Azure Web App health route: `/api/health`
- Azure SQL schema and seed scripts in `scripts/sql/`
- AI chat UI powered by OpenRouter through `/api/ai/chat`, with mock fallback

## Local setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo access code: `metyis2026`

## Data source behavior

Local development defaults to deterministic mock data:

```env
DATA_SOURCE=mock
NEXT_PUBLIC_DEMO_PASSWORD=metyis2026
```

To use Azure SQL locally, set `.env.local` to:

```env
DATA_SOURCE=azure-sql
AZURE_SQL_CONNECTION_STRING="Server=tcp:metyis-es-genai-app-server.database.windows.net,1433;Initial Catalog=metyis-es-genai-app-database;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication=Active Directory Default;"
NEXT_PUBLIC_DEMO_PASSWORD=metyis2026
NEXT_PUBLIC_APP_NAME="Metyis Spain"
```

Then authenticate locally with Azure CLI or another Microsoft Entra Default credential provider:

```bash
az login
npm run dev
```

## Azure SQL setup

Run these scripts against `metyis-es-genai-app-database`:

```text
scripts/sql/schema.sql
scripts/sql/seed.sql
scripts/sql/seed-analytics.sql
```

The schema is BI-style and ready for expansion:

- `dim_kpi`
- `dim_region`
- `dim_country`
- `dim_business_unit`
- `dim_product`
- `fact_kpi_snapshot`
- `fact_kpi_timeseries`
- `fact_ranking`
- `fact_mix_distribution`
- `app_visual_data`
- `app_dashboard_layout`

`seed-analytics.sql` populates the fact tables used directly by `/api/visual-data`; `app_visual_data` is retained only as an optional future cache/payload table.

## AI Chat With OpenRouter

The side-panel AI Assistant and Insight Agent widget call `/api/ai/chat`. The server route uses OpenRouter with compact business context:

- current dashboard filters and selected KPI context
- latest core KPI snapshot summary
- top 5 saved simulator scenarios

Add these values to `.env.local`:

```env
OPENROUTER_API_KEY="<openrouter-api-key>"
OPENROUTER_MODEL="openrouter/free"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_APP_NAME="Metyis Spain AI Dashboard"
```

If the configured model is unavailable, the route retries `openrouter/free`. If OpenRouter is unavailable, rate-limited, or not configured, the chat returns a local mock response and marks it as a fallback in the UI.

## Azure Web App deployment

Target Web App:

[https://metyis-es-genai-app-gecqa0hmhpfnhbbb.westeurope-01.azurewebsites.net/](https://metyis-es-genai-app-gecqa0hmhpfnhbbb.westeurope-01.azurewebsites.net/)

Recommended Azure App Service startup command:

```bash
npm run start
```

Build command:

```bash
npm install && npm run build
```

Health check path:

```text
/api/health
```

## Thumbnails

Thumbnail capture and committed preview images were removed intentionally. The widget gallery now uses lightweight icon previews. Thumbnail support can be added later by introducing a new preview component and a capture workflow.
