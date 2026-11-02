# MAP: DealDirect mobile app

Expo SDK 54, React Native 0.81, expo-router 6, NativeWind, TanStack Query, zod. Android release via EAS, uploaded to Play by Chirag. Branch `main`.

## Where things live
| Path | Job |
|---|---|
| `app/` | Routes (expo-router). Screens stay thin: state + layout, logic in `src/features/*` |
| `src/api/` | `call(endpoint, { data, params })` is the only way to hit the backend. Endpoints declared with `defineEndpoint` in `endpoints/*.ts`; errors normalised to `ApiError` (branch on `code`, never `message`); query keys in `queryKeys.ts` (`qk`) |
| `src/types/backend/` | Backend contract types, one file per controller; `BackendErrorCode` union in `common.ts` |
| `src/auth/` | `AuthProvider` (cookie session, `/users/me` probe), zod form schemas, Google sign-in (native SDK loaded lazily), phone gate, signup consent |
| `src/features/<domain>/` | Hooks, pure helpers and components per domain (profile, projects, listings, content, deals ...) |
| `src/features/content/pages/` | Legal and help copy as data (`ContentPage` in `model.ts`), mirrored from the website's pages, rendered by `ContentPageView` at `app/legal/[id].tsx` |
| `src/ui/` | Design-system components (Button, Input, ListGroup/ListRow, Sheet, Toast via `useToast`, EmptyState ...) |
| `src/theme/` | Colours, type, spacing (`useTheme`, `screenPadding`) |
| `src/storage/` | MMKV (`mmkv.ts`) and SecureStore (`secure.ts`); `clearUserScopedStorage` on sign-out |
| `src/config/` | `env.ts` (EXPO_PUBLIC_*), `optionalNativeModule` for modules absent in Expo Go |
| `src/observability/` | Sentry (user = `{ id, role }` only) |
| `src/analytics/` | Own-backend event queue; no third-party analytics |
| `plugins/` | Expo config plugins (portrait on phones etc.) |
| `docs/` | API contract, Play readiness, data-safety form, DPDP plan |

## The one way to do X
- API call: add `defineEndpoint` in `src/api/endpoints/<area>.ts`, types in `src/types/backend/<area>.ts`, call via `call()`; mutations through TanStack `useMutation` in `src/features/<domain>/hooks.ts`, then `refreshUser()` when the user document changed.
- Form: react-hook-form + zod schema (`src/auth/schemas.ts` mirrors backend rules); field errors under the field, form error above the submit button.
- Error copy: switch on `ApiError.code`; fall back to `error.message`.
- New backend error code: add it to `BackendErrorCode` first.
- Legal/help text: edit `src/features/content/pages/*.ts` in the same change as the website file it mirrors.
- Optimistic toggle: show the new value, save, on failure show the old value and an error line.
- Marketing messages: any promotional send must read `user.preferences.marketing` (default false) and honour unsubscribe/STOP.

## Conventions
- Tests: `node --test` on PURE modules only (no React Native, no `@/` alias; relative imports with `.ts` extension). Put logic worth testing in an import-free file beside the screen's hook. Test names are user stories.
- Commands: `npm run typecheck`, `npm test`, `npm run lint`. No local release, Gradle release or EAS build without Chirag's OK.
- Commits: conventional (`feat(scope): what and why`), on `main`, staged file by file.
- Version lives in `app.config.js` `version` and `package.json`; keep them equal.

## Do not duplicate
`call()`/`defineEndpoint`, `ApiError`, `qk`, `useAuth()` user (no second profile query), `ListGroup`/`ListRow`, `useToast`, `optionalNativeModule`, `normalizeIndianMobile`, `enquiryStatus`, `ContentPageView`.

## Traps
- `style={({ pressed }) => ...}` is banned by lint: NativeWind's css-interop drops function styles silently. Use `active:` classes or `PressableScale`.
- Native modules absent in Expo Go (Google sign-in, image picker) must be loaded lazily (`googleSignIn.ts`, `optionalNativeModule`) or the app white-screens at launch.
- The session is an HttpOnly cookie mirrored to SecureStore; there is no token or refresh endpoint. A 401 on auth-owned paths is handled by `AuthProvider`, not the global handler.
- `.env` is untracked and holds the API and socket URLs; both must be `https://` in release builds.
- `PUT /users/profile` takes multipart for the edit form, JSON for preference-only saves; the backend merges `preferences` per key.
