# Architecture

`replo.it` is a Next.js client of the public Replo API and imports only `@replo/sdk`; it never imports API services. `api.replo.eu` owns tenant authentication, quotas, redaction, campaign state, jobs, provider orchestration, event ingestion, and outbound webhook boundaries. PostgreSQL/Drizzle is the durable production model; the deterministic memory store supports isolated CI.

The enrichment package uses seed addresses, public page extraction, deterministic patterns, DNS/MX inspection, and conservative confidence. The sending package exposes `SenderPort`, with Smartlead as the production implementation and an in-memory fake for CI.

Smartlead events are normalized, de-duplicated, and mapped to sends, replies, bounces, and unsubscribes. Full reply data is always stored server-side. The API projects a redacted DTO for Free tenants and a complete DTO for Pro tenants.
