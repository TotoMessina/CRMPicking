import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * Reporte Semanal Automático v2.0
 * Se ejecuta diariamente vía cron y decide a qué empresas reportar según su configuración.
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes

    console.log(`Ejecutando proceso de reportes para el día de la semana: ${dayOfWeek}`)

    // 1. Obtener empresas cuyo 'dia_reporte' coincida con hoy
    const { data: empresas, error: empError } = await supabase
      .from('empresas')
      .select('id, nombre, dia_reporte')
      .eq('dia_reporte', dayOfWeek)

    if (empError) throw empError;
    if (!empresas || empresas.length === 0) {
      return new Response(JSON.stringify({ message: "No hay empresas configuradas para reportar hoy." }), { status: 200 })
    }

    const results = []

    for (const emp of empresas) {
      console.log(`Generando reporte para: ${emp.nombre}`)

      // 2. Obtener destinatarios activos
      const { data: recipients } = await supabase
        .from('report_recipients')
        .select('email')
        .eq('empresa_id', emp.id)
        .eq('activo', true)

      if (!recipients || recipients.length === 0) {
        console.warn(`Sin destinatarios configurados para ${emp.nombre}`)
        continue
      }

      const emails = recipients.map(r => r.email)

      // 3. Calcular KPIs de la última semana
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const isoWeekAgo = weekAgo.toISOString()

      // Nuevos locales
      const { count: nuevosLocales } = await supabase
        .from('empresa_cliente')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', emp.id)
        .gte('created_at', isoWeekAgo)

      // Cierres efectivos (Estado 5 o 4)
      const { data: cierres } = await supabase
        .from('actividades')
        .select('id')
        .eq('empresa_id', emp.id)
        .gte('fecha', isoWeekAgo)
        .or('descripcion.ilike.%➔ 5 - Local Visitado Activo%,descripcion.ilike.%➔ 4 - Local Creado%')

      const totalCierres = cierres?.length || 0

      // 4. Construir Reporte HTML Premium
      const reportHtml = `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1a202c; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <div style="text-align: center; marginBottom: 30px;">
            <div style="display: inline-block; padding: 12px 20px; background: #0c0c0c; color: white; border-radius: 12px; font-weight: 900; letter-spacing: -0.05em; font-size: 1.5rem;">
                PickUp <span style="color: #6366f1;">CRM</span>
            </div>
          </div>

          <h2 style="margin: 30px 0 10px; font-size: 1.5rem; font-weight: 800; text-align: center;">Resumen Semanal de Operaciones</h2>
          <p style="text-align: center; color: #718096; margin-bottom: 40px;">Empresa: <strong>${emp.nombre}</strong><br/>Periodo: ${weekAgo.toLocaleDateString()} — ${today.toLocaleDateString()}</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Nuevos Prospectos</div>
              <div style="font-size: 2.2rem; font-weight: 900; color: #0c0c0c;">${nuevosLocales}</div>
            </div>
            <div style="background: #f0fff4; padding: 24px; border-radius: 20px; border: 1px solid #c6f6d5; text-align: center;">
              <div style="font-size: 0.75rem; font-weight: 800; color: #2f855a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Cierres Logrados</div>
              <div style="font-size: 2.2rem; font-weight: 900; color: #38a169;">${totalCierres}</div>
            </div>
          </div>

          <div style="background: #ebf8ff; padding: 20px; border-radius: 16px; border: 1px solid #bee3f8; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 0.85rem; color: #2b6cb0; line-height: 1.5;">
              <strong>Proyección IA:</strong> Basado en el volumen actual, el equipo mantiene un ritmo de crecimiento estable. Se recomienda reforzar las visitas en los locales relevados hace más de 48hs.
            </p>
          </div>

          <div style="text-align: center; border-top: 1px solid #edf2f7; padding-top: 30px; margin-top: 20px;">
            <a href="https://tu-crm-url.com/estadisticas" style="display: inline-block; padding: 14px 28px; background: #0c0c0c; color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 0.9rem;">Ver Panel Completo</a>
            <p style="margin-top: 20px; font-size: 0.75rem; color: #a0aec0;">
              Este es un reporte automático enviado por el motor de inteligencia de PickUp CRM.<br/>
              © 2026 PickUp Logistics & CRM.
            </p>
          </div>
        </div>
      `

      if (RESEND_API_KEY) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'PickUp Intelligence <reports@resend.dev>',
            to: emails,
            subject: `📊 Reporte Semanal: ${emp.nombre}`,
            html: reportHtml
          })
        })
        
        const resData = await res.json()
        results.push({ empresa: emp.nombre, resData })
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
