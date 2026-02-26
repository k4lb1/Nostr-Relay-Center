# Relay Admin Error Reporting (Kind 1984)

Quick & dirty error reporting for nostr-rs-relay. Sends critical errors as Nostr events (Kind 1984) to an admin pubkey when DB/validation fails.

## Integration into nostr-rs-relay

1. Copy `admin_error.rs` into `src/` of your nostr-rs-relay fork
2. Add to `src/lib.rs`: `pub mod admin_error;`
3. Extend `config.toml` with `[admin_error]` section (see below)
4. Extend `config.rs` (see `config_example.rs`) and `Settings` struct
5. In `start_server()`: build `AdminErrorContext` from settings, clone into closure
6. Call `admin_error::send_admin_error_event()` from error handlers (db_writer, nostr_server)

## Config

Add to `config.toml`:

```toml
[admin_error]
# Relay secret key (hex or nsec1) for signing error events
relay_sk = "YOUR_RELAY_NSEC_OR_HEX_SK"
# Admin pubkey (hex, 64 chars) - receives error events via #p tag
admin_pubkey = "DEIN_PUBKEY_HIER"
# Optional: rate limit in seconds (default 60)
#rate_limit_secs = 60
```

## Usage

```rust
// In db_writer, on connection loss:
admin_error::send_admin_error_event(
    "Database connection lost",
    &admin_error_ctx,
    bcast_tx,
);

// On NIP-01 validation failure (in nostr_server, Err branch):
admin_error::send_admin_error_event(
    &format!("NIP-01 validation failed: {}", e),
    &admin_error_ctx,
    bcast_tx,
);
```

## Rate limiting

Max 1 error event per 60 seconds (configurable via `rate_limit_secs`).

## PWA Subscription

The Nostr Relay Center PWA subscribes to `{"kinds":[1984],"#p":["<admin_pubkey>"]}` when connected and displays incoming admin errors in the Error Console.
