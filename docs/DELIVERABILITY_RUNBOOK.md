# Deliverability runbook

This runbook is executed by the Replo operator, not delegated to customers.

## Separation

Cold outbound is Smartlead on dedicated Replo-controlled sending domains and warmed mailboxes. Product/auth/billing mail uses Resend from the transactional domain. Never mix the two reputations.

## Domain controls

- Publish one SPF record using the mailbox host's exact include. Never publish multiple SPF TXT records.
- Publish every DKIM CNAME/TXT supplied by the mailbox host and confirm selector resolution.
- Start DMARC at `_dmarc.<domain>` with `v=DMARC1; p=none; rua=mailto:dmarc@replo.eu; adkim=s; aspf=s; pct=100`; review reports, then advance to quarantine and reject.
- Apply Smartlead's tracking CNAME only when used; link tracking is disabled by default for safer first-touch plain text.
- Reverse DNS is controlled by the mailbox host. Confirm its sending IP has aligned PTR/HELO where the host exposes it.

## Mailboxes and ramp

Enable warmup before production campaigns. Use at least two active mailboxes and keep each at or below its provider daily cap. New domains ramp `10, 15, 20, 25, 30, 40, 50` daily sends; do not jump to Pro volume. Pause immediately when aggregate bounce rate exceeds 3%, investigate list provenance/DNS, and resume only below threshold.

## Go-live procedure

1. Confirm Smartlead API health and list mailbox IDs with `pnpm verify:esp`.
2. Confirm SPF, DKIM, DMARC, tracking, mailbox connection, and warmup status in provider and DNS dashboards.
3. Register the public HTTPS callback ending `/v1/webhooks/esp/smartlead?secret=<secret>` for sent, reply, bounce, unsubscribe, and campaign status events.
4. Set the same secret and mailbox IDs in production environment variables.
5. Run `pnpm smoke:live` with only the operator-owned `LIVE_TEST_LEAD_EMAIL`.
6. Confirm delivery in the owned inbox, reply, confirm webhook ingestion, Testing redaction, and paid-plan unlock.
7. Record identifiers and timestamps—never secrets—in `OPS_STATE.md`.

## Incident response

Bounce rate above 3% auto-pauses the local and provider campaign. Keep unsubscribed leads suppressed. Provider retries are idempotent through event IDs. If a webhook is delayed, inspect provider delivery logs and replay after restoring a 2xx response.
