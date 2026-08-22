import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import jwt from 'https://esm.sh/jsonwebtoken@9'

// Returns a volunteer's complete profile and shifts data for magic-link authentication.
// The signed token IS the auth — a valid token (minted only by admins) unlocks exactly
// that one volunteer's data, fetched with the service role so no login/RLS is needed.
// This function returns data formatted for direct consumption by the auth hooks.

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

    // Get complete volunteer profile data
    const { data: profile } = await admin
      .from('user_info')
      .select('user_id, first_name, last_name, email, hours_volunteered, active_shifts, organization, birthday, phone_number, emergency_contact_name, emergency_contact_phone, employer, street_address, city, zip_code, age_range, parent_email, can_self_report, first_volunteered_at')
      .eq('user_id', volunteerId)
      .maybeSingle()

    if (!profile) return json({ error: 'Volunteer not found.' }, 404)

    // Get volunteer's approved hours entries (similar to get-volunteer-profile)
    const { data: entries } = await admin
      .from('hour_entries')
      .select('hours, task, created_at, status')
      .eq('user_id', volunteerId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100)

    // Get shifts data for this volunteer (their signup history)
    // We'll get shifts they've signed up for, with shift details
    const { data: shiftSignups } = await admin
      .from('signups')
      .select('shift_id, status')
      .eq('user_id', volunteerId)

    // Get shift details for those signups
    let shiftsData = []
    if (shiftSignups && shiftSignups.length > 0) {
      const shiftIds = shiftSignups.map((signup: any) => signup.shift_id)
      const { data: shifts } = await admin
        .from('shifts')
        .select('id, spots_left, shift_start, shift_end, job_id, recurrence_group, hours_awarded, jobs ( name, min_age, visible, description, requirements )')
        .in('id', shiftIds)

      // Format shifts data to match what useShifts.fetchShifts expects
      if (shifts) {
        shiftsData = shifts
          .map((shift: any) => {
            if (!shift.shift_start || !shift.shift_end) return null

            const job = Array.isArray(shift.jobs) ? shift.jobs[0] : shift.jobs

            const startDate = new Date(shift.shift_start)
            const endDate = new Date(shift.shift_end)

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null

            const formattedDate = startDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'America/Los_Angeles'
            } as const)

            const startTime = startDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Los_Angeles'
            })

            const endTime = endDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Los_Angeles'
            })

            const weekdayLong = startDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Los_Angeles' })
            const monthLong = startDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'America/Los_Angeles' })
            const dayNum = Number(startDate.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/Los_Angeles' }))
            const dateLabel = `${weekdayLong}, ${monthLong} ${getOrdinalDay(dayNum)}`

            return {
              id: shift.id,
              role: job?.name || 'General',
              time: `${formattedDate} · ${startTime} - ${endTime}`,
              spotsLeft: shift.spots_left ?? 0,
              startDate,
              endDate,
              dateLabel,
              timeLabel: `${startTime} - ${endTime}`,
              jobId: shift.job_id ?? null,
              password: null as string | null,
              minAge: job?.min_age ?? null,
              jobVisible: job?.visible ?? false,
              jobDescription: job?.description ?? null,
              jobRequirements: job?.requirements ?? null,
              hasJob: !!job,
              recurrenceGroup: shift.recurrence_group ?? null,
              hoursAwarded: shift.hours_awarded ?? false,
            }
          })
          .filter((shift): shift is any => shift !== null)
      }
    }

    return json({
      profile: { ...profile, entries: entries ?? [] },
      shifts: shiftsData
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})

// Helper function to get ordinal day suffix (1st, 2nd, 3rd, etc.)
function getOrdinalDay(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}