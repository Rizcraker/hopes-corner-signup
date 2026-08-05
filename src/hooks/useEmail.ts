import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  from_name: string | null
  from_email: string | null
  created_at: string
}

export interface SendResult {
  sent: number
  total: number
  failures: { recipient: string; error: string }[]
}

// Email templates (email_templates table) + sending via the send-email Edge Function.
export function useEmail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [sending, setSending] = useState(false)

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase.from('email_templates').select('*').order('name')
    if (error) { console.error('Error loading templates:', error); return }
    setTemplates(data as EmailTemplate[])
  }, [])

  const saveTemplate = useCallback(async (t: {
    name: string; subject: string; body_html: string; from_name?: string | null; from_email?: string | null
  }) => {
    const { error } = await supabase.from('email_templates').insert(t)
    if (error) throw error
    await fetchTemplates()
  }, [fetchTemplates])

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id)
    if (error) throw error
    await fetchTemplates()
  }, [fetchTemplates])

  const sendEmail = useCallback(async (payload: {
    to: string[]; subject: string; html: string; fromName?: string; fromEmail?: string
  }): Promise<SendResult> => {
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-email', { body: payload })
      if (error) throw error
      return data as SendResult
    } finally {
      setSending(false)
    }
  }, [])

  return { templates, sending, fetchTemplates, saveTemplate, deleteTemplate, sendEmail }
}
