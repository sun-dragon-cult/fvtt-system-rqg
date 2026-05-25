# Guide: fvtt-types Compatibility Updates

Use this guide when handling Foundry runtime/type mismatches.

## Checklist

- Prefer existing typed APIs and project type aliases before introducing casts.
- Use `src/global.d.ts` for global augmentations (new globals, namespace/type additions).
- Use `src/system/fvttTypeCompat.ts` for runtime-safe wrappers when `fvtt-types` lags runtime behavior.
- Use `@ts-expect-error TEMP(v14-types)` only when the runtime API is confirmed and a cleaner typed wrapper is not practical.
- Keep compatibility comments precise so they can be removed once upstream typings catch up.
- Verify with `pnpm typecheck` and targeted tests where behavior is affected.
