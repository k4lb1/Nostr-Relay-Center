//! Admin error reporting via Nostr Kind 1984.
//! Drop into nostr-rs-relay src/, add config, call from error handlers.

use crate::event::Event;
use nostr::{EventBuilder, Keys, Kind, Tag};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::broadcast::Sender;
use tracing::warn;

/// Context for admin error reporting. Create once at startup.
pub struct AdminErrorContext {
    keys: Keys,
    admin_pubkey: nostr::PublicKey,
    rate_limit_secs: u64,
    last_sent_at: AtomicU64,
}

impl AdminErrorContext {
    /// Build from config. Returns None if relay_sk or admin_pubkey is missing/invalid.
    pub fn new(relay_sk: &str, admin_pubkey_hex: &str, rate_limit_secs: u64) -> Option<Self> {
        let keys = Keys::from_sk_str(relay_sk).ok()?;
        let admin_pubkey = nostr::PublicKey::from_str(admin_pubkey_hex).ok()?;
        if admin_pubkey_hex.len() != 64 || !admin_pubkey_hex.chars().all(|c| c.is_ascii_hexdigit()) {
            return None;
        }
        Some(Self {
            keys,
            admin_pubkey,
            rate_limit_secs,
            last_sent_at: AtomicU64::new(0),
        })
    }
}

/// Send an admin error event (Kind 1984) to the broadcast stream.
/// Tagged with admin pubkey for subscription. Rate-limited.
/// Non-blocking: errors are logged but do not propagate.
pub fn send_admin_error_event(
    error_msg: &str,
    ctx: &AdminErrorContext,
    bcast_tx: &Sender<Event>,
) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let last = ctx.last_sent_at.load(Ordering::Relaxed);
    if last > 0 && now.saturating_sub(last) < ctx.rate_limit_secs {
        return;
    }
    ctx.last_sent_at.store(now, Ordering::Relaxed);

    let truncated = if error_msg.len() > 500 {
        format!("{}...", &error_msg[..497])
    } else {
        error_msg.to_string()
    };

    let tag = Tag::public_key(ctx.admin_pubkey);

    let Ok(nostr_event) = EventBuilder::new(Kind::Custom(1984), truncated)
        .tag(tag)
        .sign_with_keys(&ctx.keys)
    else {
        warn!("admin_error: failed to sign event");
        return;
    };

    let mut relay_event = Event::from(nostr_event);
    relay_event.build_index();

    if bcast_tx.send(relay_event).is_err() {
        warn!("admin_error: broadcast channel closed");
    }
}
