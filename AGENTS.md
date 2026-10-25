<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live in `user_roles` (admin, prodavac, monter, klijent); all access control is enforced by RLS helper functions (`has_role`, `is_staff`, `can_access_order`, `can_edit_order`) — UI checks only hide controls.
- First signed-up user becomes admin, later sign-ups become klijent and are auto-linked to a `clients` row by matching email (trigger `handle_new_user`).
- Signed-in pages live under `src/routes/_authenticated/` and read data client-side via the browser client so RLS applies.
- Order photos go to the private `order-photos` bucket under `<order_id>/...`; storage policies key off that folder.
- Order PDFs are generated client-side with jsPDF using Noto Sans loaded from public/fonts so Croatian diacritics render.
- PWA is manifest-only (installable, no service worker) until offline support is explicitly requested.
- Yearly service and due-window rules live in src/lib/crm.ts (covered by src/test/crm.test.ts) so UI and tests share one source.
