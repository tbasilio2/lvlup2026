# Architecture rules
- Keep public plan packaging separate from legacy subscription tier values and use plan_version to preserve old Pro entitlements, because purchased licenses must not lose access.
- Enforce paid sync/AI features through the shared database entitlement function and a server-side helper, because client controls are not authorization boundaries.
- Store trader onboarding answers and completion in existing profiles, because setup must survive device changes without creating another identity model.
- Enforce the free manual trade limit with a serialized insert trigger while exempting server sync, because concurrent inserts must not bypass limits or break imported history.
- Reuse real journal components with explicitly illustrative sample data for public previews, because marketing must accurately represent the application without exposing customer data.
- Track only allowlisted aggregate event names with no identity or input payload, because conversion measurement must not collect credentials or financial details.
- Keep public subscription and separate education checkout URLs centralized and empty until configured, because unavailable checkout must fail safely.
