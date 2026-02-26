# Relay Admin Error Reporting (Kind 1984)

Sends critical relay errors as Nostr events (Kind 1984) to a configurable admin pubkey. Admins can subscribe and receive alerts in any Nostr client (e.g. Nostr Relay Center PWA).

## How it works

- **Kind 1984:** The relay creates signed Nostr events containing the error message.
- **#p tag:** Admin pubkey in the event so admins can subscribe with a filter.
- **Rate limit:** Default 60 seconds between events to avoid flooding.
- **Distribution:** Via `bcast_tx` (broadcast to connected clients), not `event_tx` (no persistence).
- **No recursion:** `send_admin_error_event` is only called from code paths that do not process Kind 1984 events. Admin events go only to the broadcast stream, not to persistence.

## Integration into nostr-rs-relay

Use a fork of [nostr-rs-relay](https://github.com/scsibug/nostr-rs-relay) since these changes are not upstream.

| File | Change |
|------|--------|
| `src/admin_error.rs` | Copy from this contrib. `AdminErrorContext`, `send_admin_error_event()`, message length capped at 500 chars |
| `src/config.rs` | Add `[admin_error]` section: `relay_sk`, `admin_pubkey`, `rate_limit_secs` (default 60) |
| `src/server.rs` | Build `AdminErrorContext` at startup; pass into `handle_web_request`, `nostr_server`, `db_writer`. On NIP-01 validation error: call `send_admin_error_event()` |
| `src/db.rs` | Pass `admin_error_ctx` to `db_writer`. On event insert error: call `send_admin_error_event()` |
| `src/lib.rs` | Add `pub mod admin_error;` |

## Configuration

Add to your `config.toml`:

```toml
[admin_error]
# Relay secret key (hex or nsec) for signing error events. Use a dedicated key, not your personal nsec.
relay_sk = "YOUR_RELAY_SECRET_KEY"
# Admin pubkey (hex, 64 chars) to receive error events
admin_pubkey = "YOUR_ADMIN_PUBKEY_HEX"
# Optional: seconds between events (default 60)
rate_limit_secs = 60
```

In production, inject `relay_sk` via environment variables or secrets (e.g. Fly.io `RELAY_SK`) instead of committing it. Example entrypoint:

```bash
if [ -n "$RELAY_SK" ]; then
  sed -i "s|relay_sk = \".*\"|relay_sk = \"$RELAY_SK\"|" config.toml
fi
exec "$@"
```

## Security

- Never commit `relay_sk`. Use platform secrets (Fly Secrets, Kubernetes Secrets, etc.).
- Use a dedicated key for the relay, not your personal nsec.
- `admin_pubkey` is the recipient of error messages (your admin identity).

## Receiving errors (PWA / clients)

The Nostr Relay Center PWA subscribes to `{"kinds":[1984],"#p":["<admin_pubkey>"]}` when connected. Connect to your relay and log in with the admin key; errors appear in the Admin Error Log section.

Any Nostr client can receive these events by subscribing with the same filter. Replace `<admin_pubkey>` with your hex pubkey.
