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
    const { volunteer_id } = await req.json()
    if (!volunteer_id) {
      return json({ error: 'volunteer_id is required' }, 400)
    }

    const secret = Deno.env.get('EMAIL_TOKEN_SECRET')
    if (!secret) {
      return json({ error: 'EMAIL_TOKEN_SECRET not set' }, 500)
    }

    // Token expires in 24 hours
    const token = jwt.sign({ volunteer_id }, secret, { expiresIn: '24h' })

    return json({ token })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})