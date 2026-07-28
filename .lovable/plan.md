## 1. Discover — scroll hint
Add the existing `ScrollHint` component under the horizontal tables list in `src/routes/discover.tsx` (below the `<ul>` of `TableCard`s). Matches the "Swipe →" affordance already used on the home page.

## 2. Notifications + emails on every submission
Today only chef-order lifecycle events and join-request status changes create notifications. Extend coverage so every user-initiated submission produces both an in-app notification and an email.

Events to cover (all currently insert into `form_submissions`, `host_applications`, `chef_meal_prep_requests`, `meal_plan_requests`, `chef_orders`, `join_requests`, or `event_bookings`):
- Host application submitted
- Guest / tastemaker application submitted
- Meal prep request submitted
- Meal plan request submitted
- Chef order requested / confirmed / cancelled / fulfilled (already partly done — verify)
- Chef payment made (card + manual) (already partly done — verify)
- Join request submitted / approved / declined / waitlisted / promoted (partly done — add "submitted")
- Event booking / RSVP (Irie, Vintage 1986, Molino order)
- Safety report submitted

Implementation:
- Add DB triggers (SECURITY DEFINER) on `form_submissions`, `host_applications`, `chef_meal_prep_requests`, `meal_plan_requests`, `event_bookings`, `join_requests` (INSERT) that insert a row into `public.notifications` for the submitting `user_id` with kind/title/body/link tailored to each source.
- For emails: enqueue via existing `enqueue_email` PG function in the same trigger, using existing templates in `src/lib/email-templates/` where they exist (host-application-received, molino-order-confirmation, irie-rsvp-notification, chef-new-order, chef-order-paid, invite, etc.). Add small new templates for the ones without one (meal-prep-request, meal-plan-request, tastemaker/guest application, safety report).
- Also send an admin-notify email for host/tastemaker applications (admin-new-host-application already exists — verify it's wired).

## 3. Favorites → meal details link
In `src/routes/_authenticated/favorites.tsx`, the "Meals" cards currently don't navigate. Wrap each meal card in a `<Link to="/listings/$slug" params={{ slug }}>` (or the correct chef listing route) so clicking opens the meal profile. Verify the slug/id stored in the favorite matches the listings route.

## 4. Host application delivery
Currently the host application submits via `src/routes/api/public/host-application.ts` (and `.resend.ts`) and writes to `host_applications`. Ensure:
- A row is also written to `notifications` for the applicant (covered by trigger in section 2).
- The confirmation email actually sends (verify `host-application-received.tsx` template is enqueued in the API handler; add the enqueue call if missing).
- Admin gets `admin-new-host-application` email (verify enqueue).

## 5. Account/Settings profile fields
Extend `src/routes/_authenticated/settings.tsx` to look like a profile:
- Add editable fields: Full name (from `profiles.display_name`), Date of birth (new column `profiles.date_of_birth date`), Email (read-only, from `auth.users`).
- Migration: `ALTER TABLE public.profiles ADD COLUMN date_of_birth date;` (RLS already scopes profiles to owner).
- Server function `updateMyProfile` using `requireSupabaseAuth` to update `display_name` and `date_of_birth`.
- UI: form with inputs + Save button, replacing the current read-only dl.

## Technical notes
- All new triggers use `SECURITY DEFINER` with `search_path = public` and only insert into `notifications` / call `enqueue_email`; failures should not roll back the user's submission (wrap email enqueue in `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END`).
- Notification `link` fields point to the relevant status/details page so clicking the bell deep-links properly.
- No changes to existing chef-order notification trigger unless a gap is found.
