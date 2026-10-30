# Desktop Web Portal (≥1024px) — Developer Notes

The mobile app (iOS/Android and web <1024px) is **unchanged / code-frozen**. Everything below only
activates on **web at window width ≥ 1024px** via `useIsDesktop()` (`src/utils/use-desktop.ts`).

## Where things live
| Area | File(s) |
|---|---|
| Breakpoint + route rules | `src/utils/use-desktop.ts` (`isWideDesktopRoute`, `isAuthRoute`, `isSplitAuthRoute`) |
| App frame (sidebar + top bar, centred column for auth) | `src/components/desktop-frame.tsx` (wraps `<Stack>` in `app/_layout.tsx`) |
| Sidebar + top header | `src/desktop/portal-shell.tsx` |
| Design tokens (canvas #F8FAFC, cards, #E2E8F0 borders) | `src/desktop/tokens.ts` |
| Shared page/table/metric/pager components | `src/desktop/ui.tsx`, `src/desktop/table-tools.ts` (sort + CSV export) |
| Dialogs + slide-over drawers | `src/desktop/overlays.tsx`, `src/desktop/sheet.ts` (bottom sheets → centred cards) |
| Dashboard | `src/desktop/dashboard-desktop.tsx` (used from `app/(tabs)/dashboard.tsx`) |
| Sites / Site detail / Reports / Renewals | `src/desktop/sites-desktop.tsx`, `site-detail-desktop.tsx`, `reports-desktop.tsx`, `renewals-desktop.tsx` |
| Quote form two-column + summary | `src/desktop/quote-desktop.tsx` (wraps `app/quote/new.tsx`) |
| My quote requests | `app/quotes/index.tsx` (mobile + desktop; `GET /api/quotes`) |
| Upload bill (drag & drop PDF/JPG/PNG → `POST /api/scans`) | `src/desktop/upload-bill.tsx` |
| Sign-in / Sign-up split layout | `src/desktop/auth-split.tsx` |
| Document review/sign desktop layout | `app/documents/[id]/review.tsx` (desktop branch) |

## Pattern used
Each screen computes `const isDesktop = useIsDesktop()` **after all hooks** and early-returns a desktop
component; the original mobile JSX below is untouched. Inactive tab scenes are hidden on desktop
(`app/(tabs)/_layout.tsx`), and the bottom tab bar is replaced by the sidebar.

## Other changes
- Business selection is remembered per user (`src/business/business-context.tsx`).
- `?notour=1` on the first URL disables the guided tour (for automated web tests).
- No backend changes were made. Endpoints used: `/properties`, `/properties/{id}/utilities`,
  `/renewals/urgent`, `/reports/spend`, `/quotes`, `/scans`, `/businesses`.
