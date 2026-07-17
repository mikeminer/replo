# API

The OpenAPI document is served at `GET /v1/openapi.json`. Clients authenticate with `Authorization: Bearer rk_live_…` or `rk_test_…`; only SHA-256 hashes are stored. The complete surface includes bootstrap, research jobs, owned resolution and verification, message generation, campaign creation/lead import/resolve/launch/pause, replies/drafts/respond, outcomes, deliverability health, Stripe events, and Smartlead webhooks.

Smartlead webhook authentication accepts the configured shared secret in `x-replo-webhook-secret` or `?secret=`, and also accepts an HMAC-SHA256 digest when supplied by an intermediary. Event IDs make processing idempotent.
