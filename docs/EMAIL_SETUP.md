# Email system setup (Resend + Supabase Edge Function)

Sending email needs a provider (Resend) behind a Supabase Edge Function. Do these
once; after that the in-app "Email volunteers" feature works.

## 1. Resend account + API key
1. Sign up at https://resend.com (free tier: 3,000 emails/month).
2. **Verify your sending domain** (`hopes-corner.org`): Resend → Domains → Add Domain →
   add the DNS records it gives you (SPF/DKIM) to your domain host. **Required** to send
   to volunteers — until then Resend only lets you email your own address from a test
   sender.
3. Resend → API Keys → Create → copy the key (`re_...`).

## 2. Give the key to Supabase
Supabase CLI:
```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```
(Or Supabase dashboard → Project Settings → Edge Functions → add secret `RESEND_API_KEY`.)
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided automatically —
don't set them.

## 3. Run the migration
Supabase → SQL Editor → paste `supabase/migrations/0010_email.sql` → Run. Creates
`email_templates` + `email_log`.

## 4. Deploy the Edge Function
**Option A — CLI** (needs the Supabase CLI + `supabase link` to the project):
```bash
supabase functions deploy send-email
```
**Option B — Dashboard:** Edge Functions → Create function → name it `send-email` →
paste the contents of `supabase/functions/send-email/index.ts` → Deploy.

## 5. Test it
From the app, signed in as an **admin**, in the browser console:
```js
const { data, error } = await window.supabase
  ? {} : {}
```
(Or just use the in-app Email tab once the UI is built.) A raw test:
```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/send-email' \
  -H "Authorization: Bearer <YOUR_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"to":["you@example.com"],"subject":"Test","html":"<p>Hello from Hope'\''s Corner</p>"}'
```
Get `<YOUR_ADMIN_ACCESS_TOKEN>` from the app: `(await supabase.auth.getSession()).data.session.access_token`.
Expected: `{ "sent": 1, "total": 1, "failures": [] }`, and a row in `email_log`.

## How it's secured
- Only signed-in **admins** can send (the function checks the `admins` table).
- The frontend calls it via `supabase.functions.invoke('send-email', { body })`, which
  attaches the admin's JWT automatically.
- Each send is written to `email_log`.

## What Claude builds after this works
The in-app Email tab: pick From (any admin), optional template, HTML body editor, and
recipient selection — **all volunteers**, **an organization/group**, or **everyone on a
specific shift/job**. It gathers the addresses and calls `send-email`.
