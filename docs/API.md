# API

The OpenAPI document is served at `GET /v1/openapi.json`. Clients authenticate with `Authorization: Bearer rk_live_…` or `rk_test_…`; only SHA-256 hashes are stored. `GET /v1/prospects/discover` is the current product endpoint and accepts a product URL plus optional buyer, territory and limit. Its response includes the site analysis, named prospects, official source evidence and a `strategy` object containing the inferred/provided buyer profile, decision-maker profile, competitor policy, automatically selected channels, context-only sources and the invariant `contactPolicy: "official_company_sites_only"`.

When the buyer is omitted, discovery infers the customer side of the go-to-market motion rather than reusing the submitted site's vendor category. `competitorPolicy: "exclude_competing_vendors"` means candidate sites presenting the same offer are rejected before contact extraction. An explicit buyer definition that names that supplier category returns `buyer_override`; categories without a reliable vendor fingerprint return `not_applicable`.

The API still contains historical campaign, provider, reply and billing routes, but those routes are dormant and are not consumed by the current research/copy web product.

Smartlead webhook authentication accepts the configured shared secret in `x-replo-webhook-secret` or `?secret=`, and also accepts an HMAC-SHA256 digest when supplied by an intermediary. Event IDs make processing idempotent.
