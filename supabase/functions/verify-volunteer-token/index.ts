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
    const { token } = await req.json()
    if (!token) {
      return json({ error: 'token is required' }, 400)
    }

    const secret = Deno.env.get('EMAIL_TOKEN_SECRET')
    if (!secret) {
      return json({ error: 'EMAIL_TOKEN_SECRET not set' }, 500)
    }

    const payload = jwt.verify(token, secret) as { volunteer_id: string }
    return json({ volunteer_id: payload.volunteer_id })
  } catch (e) {
    // jwt.verify throws error if token is invalid/expired
    return json({ error: 'Invalid or expired token' }, 401)
  }
})