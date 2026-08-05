// Hope's Corner — send-email Edge Function (Supabase + Resend)
// Deploy:  supabase functions deploy send-email
// Secret:  supabase secrets set RESEND_API_KEY=re_xxx
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Only admins can call it. The frontend invokes it with the signed-in user's JWT
// (supabase.functions.invoke attaches it), we confirm the caller is in `admins`,
// then send each email through Resend and write a row to `email_log`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const authHeader = req.headers.get('Authorization') ?? ''

    // 1. Identify the caller from their JWT.
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)

    // 2. Confirm they're an admin (service-role client bypasses RLS for this check + logging).
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Admins only' }, 403)

    // 3. Validate payload.
    const { to, subject, html, fromName, fromEmail } = await req.json()
    const recipients: string[] = Array.isArray(to) ? [...new Set(to.filter(Boolean))] : []
    if (recipients.length === 0 || !subject || !html) {
      return json({ error: 'Missing to[], subject, or html' }, 400)
    }
    const from = `${fromName || "Hope's Corner"} <${fromEmail || 'volunteer@hopes-corner.org'}>`

    // 4. Send one email per recipient (keeps addresses private). Resend free tier: 3k/mo.
    const RESEND = Deno.env.get('RESEND_API_KEY')
    if (!RESEND) return json({ error: 'RESEND_API_KEY not set' }, 500)

    let sent = 0
    const failures: { recipient: string; error: string }[] = []
    for (const recipient of recipients) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [recipient], subject, html }),
      })
      if (res.ok) sent++
      else failures.push({ recipient, error: `${res.status} ${await res.text()}`.slice(0, 200) })
    }

    // 5. Log it.
    await admin.from('email_log').insert({
      sent_by: user.id,
      subject,
      recipient_count: recipients.length,
      recipients,
      status: `${sent}/${recipients.length} sent`,
    })

    return json({ sent, total: recipients.length, failures })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
