// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-report-secret',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDateRange(now: Date) {
    const end = new Date(now)
    end.setHours(0, 0, 0, 0)

    const start = new Date(end)
    start.setDate(end.getDate() - 7)

    return {
        from: start.toISOString(),
        to: end.toISOString(),
        fromLabel: formatDate(start),
        toLabel: formatDate(new Date(end.getTime() - 1)),
    }
}

// ─── Email HTML template ─────────────────────────────────────────────────────

function buildEmailHtml(data: {
    empresaNombre: string
    periodo: { fromLabel: string; toLabel: string }
    clientesNuevos: number
    clientesActivos: number
    visitas: number
    conversion: string
    topActivadores: Array<{ nombre: string; visitas: number }>
    clientesRiesgo: number
    rubros: Array<{ rubro: string; cantidad: number }>
}) {
    const { empresaNombre, periodo, clientesNuevos, clientesActivos, visitas, conversion, topActivadores, clientesRiesgo, rubros } = data

    const activadoresRows = topActivadores.map(a => `
        <tr>
            <td style="padding:10px 16px;border-bottom:1px solid #1e293b;color:#e2e8f0;">${a.nombre}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #1e293b;text-align:right;font-weight:700;color:#38bdf8;">${a.visitas}</td>
        </tr>`).join('')

    const rubrosRows = rubros.slice(0, 5).map(r => `
        <tr>
            <td style="padding:8px 16px;border-bottom:1px solid #1e293b;color:#e2e8f0;">${r.rubro || 'Sin rubro'}</td>
            <td style="padding:8px 16px;border-bottom:1px solid #1e293b;text-align:right;font-weight:600;color:#94a3b8;">${r.cantidad}</td>
        </tr>`).join('')

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reporte Semanal CRM - ${empresaNombre}</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);padding:12px 28px;border-radius:14px;margin-bottom:16px;">
      <span style="font-size:1.3rem;font-weight:800;color:#fff;letter-spacing:-0.5px;">📊 PickingUp CRM</span>
    </div>
    <h1 style="margin:0;color:#f1f5f9;font-size:1.5rem;font-weight:700;">Reporte Semanal</h1>
    <p style="margin:8px 0 0;color:#64748b;font-size:0.95rem;">${empresaNombre} · ${periodo.fromLabel} – ${periodo.toLabel}</p>
  </div>

  <!-- KPI Cards -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:2.2rem;font-weight:800;color:#34d399;">${clientesNuevos}</div>
      <div style="font-size:0.82rem;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Nuevos Locales</div>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:2.2rem;font-weight:800;color:#38bdf8;">${visitas}</div>
      <div style="font-size:0.82rem;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Actividades</div>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:2.2rem;font-weight:800;color:#a78bfa;">${clientesActivos}</div>
      <div style="font-size:0.82rem;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Locales Activos</div>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:2.2rem;font-weight:800;color:${clientesRiesgo > 5 ? '#f87171' : '#fbbf24'};">${clientesRiesgo}</div>
      <div style="font-size:0.82rem;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">En Riesgo</div>
    </div>
  </div>

  <!-- Conversion rate -->
  <div style="background:linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.15));border:1px solid #2563eb44;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;">
    <div style="font-size:0.82rem;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Tasa de Conversión (relevados → activos)</div>
    <div style="font-size:2.5rem;font-weight:900;color:#a78bfa;">${conversion}%</div>
  </div>

  <!-- Top Activadores -->
  ${topActivadores.length > 0 ? `
  <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:18px 16px;border-bottom:1px solid #334155;">
      <h2 style="margin:0;font-size:1rem;color:#f1f5f9;font-weight:700;">🏆 Ranking de Activadores</h2>
      <p style="margin:4px 0 0;font-size:0.82rem;color:#64748b;">Actividades registradas en la semana</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#0f172a;">
          <th style="padding:10px 16px;text-align:left;font-size:0.75rem;color:#64748b;text-transform:uppercase;font-weight:600;">Activador</th>
          <th style="padding:10px 16px;text-align:right;font-size:0.75rem;color:#64748b;text-transform:uppercase;font-weight:600;">Actividades</th>
        </tr>
      </thead>
      <tbody>${activadoresRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Top Rubros -->
  ${rubros.length > 0 ? `
  <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:18px 16px;border-bottom:1px solid #334155;">
      <h2 style="margin:0;font-size:1rem;color:#f1f5f9;font-weight:700;">📂 Top Rubros Relevados</h2>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tbody>${rubrosRows}</tbody>
    </table>
  </div>` : ''}

  ${clientesRiesgo > 0 ? `
  <!-- Risk Alert -->
  <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:20px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:1.5rem;">⚠️</span>
      <div>
        <div style="font-size:0.95rem;font-weight:700;color:#f87171;">Alerta de Churn</div>
        <div style="font-size:0.85rem;color:#94a3b8;margin-top:4px;">${clientesRiesgo} cliente${clientesRiesgo !== 1 ? 's activos llevan' : ' activo lleva'} más de 30 días sin contacto. Revisá el mapa de riesgo en el CRM.</div>
      </div>
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e293b;">
    <p style="margin:0;font-size:0.8rem;color:#475569;">Reporte generado automáticamente por <strong style="color:#64748b;">PickingUp CRM</strong></p>
    <p style="margin:6px 0 0;font-size:0.75rem;color:#334155;">Este reporte corresponde al período del ${periodo.fromLabel} al ${periodo.toLabel}</p>
  </div>

</div>
</body>
</html>`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Validate secret to prevent unauthorized invocations (when called from cron without JWT)
        const reportSecret = Deno.env.get('REPORT_SECRET')
        const incomingSecret = req.headers.get('x-report-secret')
        if (reportSecret && incomingSecret !== reportSecret) {
            // Also allow valid Supabase JWTs for manual "send test" from UI
            const authHeader = req.headers.get('Authorization')
            if (!authHeader?.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
            }
        }

        // Parse optional body for overrides (test mode, specific empresa_id)
        let body: any = {}
        try { body = await req.json() } catch { /* empty body from cron */ }
        const testMode = body?.test === true || body?.test === 'true'

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Service role for full DB access
        )

        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) throw new Error('RESEND_API_KEY env variable is not set')

        // Fetch recipients and config (dia_reporte)
        const { data: recipients, error: recipError } = await supabase
            .from('report_recipients')
            .select('*, empresas(nombre, dia_reporte)')
            .eq('activo', true)

        if (recipError) throw recipError
        if (!recipients || recipients.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No active recipients configured' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const currentDayOfWeek = new Date().getDay() // 0=Sun, 1=Mon...
        const byEmpresa: Record<string, { emails: string[], nombre: string }> = {}
        
        for (const r of recipients) {
            const emp = r.empresas as any
            const diaReporte = emp?.dia_reporte !== undefined && emp?.dia_reporte !== null ? parseInt(emp.dia_reporte) : 1 // 1=monday
            
            // Si es desde Cron y no es su dia elegido, lo saltamos
            if (!testMode && diaReporte !== currentDayOfWeek) continue;

            if (!byEmpresa[r.empresa_id]) {
                byEmpresa[r.empresa_id] = { emails: [], nombre: emp?.nombre || 'Mi Empresa' }
            }
            byEmpresa[r.empresa_id].emails.push(r.email)
        }

        const results: any[] = []

        for (const [empresaId, { emails, nombre }] of Object.entries(byEmpresa)) {
            // Calcular rango dinámico últimos 7 días relativo a hoy
            const { from: weekFrom, to: weekTo, fromLabel, toLabel } = getDateRange(new Date())

            // ── Query weekly KPIs ─────────────────────────────────────────────

            // 1. New clients this week
            const { count: clientesNuevos } = await supabase
                .from('empresa_cliente')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .gte('created_at', weekFrom)
                .lt('created_at', weekTo)

            // 2. Total active clients (estado = '5 - Local Visitado Activo' or similar)
            const { count: clientesActivos } = await supabase
                .from('empresa_cliente')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .like('estado', '%Activo%')

            // 3. Total activities this week (visitas/contactos)
            const { count: visitas } = await supabase
                .from('actividades')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .gte('fecha', weekFrom)
                .lt('fecha', weekTo)

            // 4. Activities by user (ranking)
            const { data: actByUser } = await supabase
                .from('actividades')
                .select('usuario')
                .eq('empresa_id', empresaId)
                .gte('fecha', weekFrom)
                .lt('fecha', weekTo)

            const userCountMap: Record<string, number> = {}
            for (const a of actByUser || []) {
                const u = a.usuario || 'Desconocido'
                userCountMap[u] = (userCountMap[u] || 0) + 1
            }
            const topActivadores = Object.entries(userCountMap)
                .map(([nombre, visitas]) => ({ nombre, visitas }))
                .sort((a, b) => b.visitas - a.visitas)
                .slice(0, 5)

            // 5. Clients at churn risk (active, no contact in 30+ days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const { count: clientesRiesgo } = await supabase
                .from('empresa_cliente')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .like('estado', '%Activo%')
                .or(`fecha_proximo_contacto.is.null,fecha_proximo_contacto.lt.${thirtyDaysAgo.toISOString().split('T')[0]}`)

            // 6. Top rubros
            const { data: rubrosData } = await supabase
                .from('empresa_cliente')
                .select('rubro')
                .eq('empresa_id', empresaId)
                .not('rubro', 'is', null)

            const rubroMap: Record<string, number> = {}
            for (const r of rubrosData || []) {
                rubroMap[r.rubro] = (rubroMap[r.rubro] || 0) + 1
            }
            const rubros = Object.entries(rubroMap)
                .map(([rubro, cantidad]) => ({ rubro, cantidad }))
                .sort((a, b) => b.cantidad - a.cantidad)

            // 7. Conversion rate
            const { count: totalRelevados } = await supabase
                .from('empresa_cliente')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
            const conversion = totalRelevados && totalRelevados > 0
                ? ((clientesActivos || 0) / totalRelevados * 100).toFixed(1)
                : '0.0'

            // ── Build and send email ──────────────────────────────────────────
            const html = buildEmailHtml({
                empresaNombre: nombre,
                periodo: { fromLabel, toLabel },
                clientesNuevos: clientesNuevos || 0,
                clientesActivos: clientesActivos || 0,
                visitas: visitas || 0,
                conversion,
                topActivadores,
                clientesRiesgo: clientesRiesgo || 0,
                rubros,
            })

            const subject = testMode
                ? `[TEST] Reporte Semanal · ${nombre} · ${fromLabel} – ${toLabel}`
                : `📊 Reporte Semanal · ${nombre} · ${fromLabel} – ${toLabel}`

            const emailRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'PickingUp CRM <onboarding@resend.dev>',
                    to: emails,
                    subject,
                    html,
                }),
            })

            const emailResult = await emailRes.json()
            results.push({ empresaId, nombre, emails, emailResult, success: emailRes.ok })

            if (!emailRes.ok) {
                console.error(`Failed to send email for empresa ${nombre}:`, emailResult)
                throw new Error(`Error de Resend: ${emailResult.message || 'Error desconocido'}`)
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('send-weekly-report error:', error)
        return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
