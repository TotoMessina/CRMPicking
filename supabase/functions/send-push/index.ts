import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ApplicationServer } from 'jsr:@negrel/webpush'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { targetEmails, payload } = await req.json()

        if (!targetEmails || !Array.isArray(targetEmails) || targetEmails.length === 0) {
            throw new Error('targetEmails is required and must be an array')
        }

        // Initialize Supabase Client to query subscriptions
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Fetch subscriptions for all targeted emails
        const { data: subs, error: subsError } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .in('user_email', targetEmails)

        if (subsError) throw subsError
        if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No subscriptions found for targeting users' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Initialize pure Deno Web Push Server
        const appServer = new ApplicationServer({
            contact: 'mailto:soporte@pickingup.com',
            vapidKeys: {
                publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
                privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
            }
        })

        const notificationPayload = JSON.stringify({
            title: payload.title || 'Nueva Notificación',
            body: payload.body || 'Tienes un nuevo mensaje en el CRM',
            url: payload.url || '/',
        })

        const promises = subs.map(async (row) => {
            try {
                await appServer.sendPushMessage(notificationPayload, row.subscription)
            } catch (err: any) {
                console.error(`Error sending push to ${row.user_email}:`, err)
                // If subscription expired/unsubscribed/failed, delete it
                if (err?.statusCode === 410 || err?.statusCode === 404 || err?.status === 410 || err?.status === 404) {
                    await supabaseClient.from('push_subscriptions').delete().eq('id', row.id)
                }
            }
        })

        await Promise.allSettled(promises)

        return new Response(
            JSON.stringify({ success: true, pushedTo: subs.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
