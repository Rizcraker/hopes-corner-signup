import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import jwt from 'https://esm.sh/jsonwebtoken@9'

// Returns a volunteer's read-only profile for the magic-link page (/volunteer-profile).
// The signed token IS the auth — a valid token (minted only by admins) unlocks exactly
// that one volunteer's data, fetched with the service role so no login/RLS is needed.

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
    const { token } = await req.json()
    if (!token) return json({ error: 'token is required' }, 400)

    const secret = Deno.env.get('EMAIL_TOKEN_SECRET')
    if (!secret) return json({ error: 'EMAIL_TOKEN_SECRET not set' }, 500)

    let volunteerId: string
    try {
      const payload = jwt.verify(token, secret) as { volunteer_id: string }
      volunteerId = payload.volunteer_id
    } catch {
      return json({ error: 'This link is invalid or has expired.' }, 401)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: profile } = await admin
      .from('user_info')
      .select('user_id, first_name, last_name, email, hours_volunteered, active_shifts, organization, birthday, phone_number, emergency_contact_name, emergency_contact_phone, employer, street_address, city, zip_code, age_range, parent_email')
      .eq('user_id', volunteerId)
      .maybeSingle()
    if (!profile) return json({ error: 'Volunteer not found.' }, 404)

    const { data: entries } = await admin
      .from('hour_entries')
      .select('hours, task, created_at, status')
      .eq('user_id', volunteerId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100)

    return json({ profile, entries: entries ?? [] })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
