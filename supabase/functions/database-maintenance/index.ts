import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Apenas POST e GET permitidos
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST to run maintenance or GET to check status.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // GET: Retorna estatisticas sem executar manutencao
    if (req.method === 'GET') {
      const { data: stats, error: statsError } = await supabaseClient.rpc('get_database_size_stats')
      
      if (statsError) {
        return new Response(
          JSON.stringify({ error: statsError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          status: 'ready',
          tables: stats,
          message: 'Use POST to execute maintenance tasks'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // POST: Executar manutencao
    const body = await req.json().catch(() => ({}))
    const tasks = body.tasks || ['cleanup_active_orders', 'archive_audit_logs']
    const results: Record<string, any> = {}

    // Tarefa 1: Limpar active_orders antigos
    if (tasks.includes('cleanup_active_orders') || tasks.includes('all')) {
      try {
        const { data, error } = await supabaseClient.rpc('cleanup_old_active_orders')
        results.cleanup_active_orders = {
          success: !error,
          data: data,
          error: error?.message || null
        }
      } catch (e: any) {
        results.cleanup_active_orders = {
          success: false,
          error: e.message
        }
      }
    }

    // Tarefa 2: Arquivar audit_logs antigos
    if (tasks.includes('archive_audit_logs') || tasks.includes('all')) {
      try {
        const { data, error } = await supabaseClient.rpc('archive_old_audit_logs')
        results.archive_audit_logs = {
          success: !error,
          data: data,
          error: error?.message || null
        }
      } catch (e: any) {
        results.archive_audit_logs = {
          success: false,
          error: e.message
        }
      }
    }

    // Estatisticas pos-manutencao
    const { data: statsAfter } = await supabaseClient.rpc('get_database_size_stats')

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        tasks_executed: tasks,
        results,
        database_stats_after: statsAfter
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
