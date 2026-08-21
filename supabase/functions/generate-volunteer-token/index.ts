import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import jwt from 'https://esm.sh/jsonwebtoken@9'

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

    // Only an authenticated admin may mint a profile token (otherwise anyone could
    // request a token for any volunteer_id and read their profile).
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Admins only' }, 403)

    const { volunteer_id } = await req.json()
    if (!volunteer_id) return json({ error: 'volunteer_id is required' }, 400)

    const secret = Deno.env.get('EMAIL_TOKEN_SECRET')
    if (!secret) return json({ error: 'EMAIL_TOKEN_SECRET not set' }, 500)

    // 30-day link so volunteers have time to open the email.
    const token = jwt.sign({ volunteer_id }, secret, { expiresIn: '30d' })
    return json({ token })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
