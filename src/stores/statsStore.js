import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { toUserError } from './petStore'

// HU-49 (panel), HU-50 (gráficas) y HU-51 (métricas de compatibilidad).
// Las agregaciones se calculan en la BD (RPC); aquí solo se consume el resultado.
export const useStatsStore = defineStore('stats', () => {
  const dashboard = ref(null)
  const charts = ref(null)
  const compat = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function rpc(scope, fn, params, target) {
    loading.value = true
    error.value = null
    try {
      const { data, error: rpcError } = await supabase.rpc(fn, params)
      if (rpcError) throw rpcError
      target.value = data
      return { success: true, data }
    } catch (e) {
      console.error('[statsStore]', scope, e)
      error.value = ['22023', '42501'].includes(e?.code) && e?.message ? e.message : toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const fetchDashboard = () => rpc('dashboard', 'shelter_dashboard_stats', undefined, dashboard)
  const fetchCharts = (from, to) => rpc('charts', 'shelter_adoption_charts', { p_from: from, p_to: to }, charts)
  const fetchCompat = () => rpc('compat', 'shelter_compatibility_metrics', undefined, compat)

  return { dashboard, charts, compat, loading, error, fetchDashboard, fetchCharts, fetchCompat }
})
