import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { toUserError } from './petStore'

// HU-41: notificaciones in-app (lista, badge de no leídas y Realtime).
export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref(null)
  const realtimeChannel = ref(null)

  const hasUnread = computed(() => unreadCount.value > 0)

  function fail(e, scope) {
    console.error('[notificationStore]', scope, e)
    error.value = toUserError(e)
    return { success: false, error: error.value }
  }

  function currentUserId() {
    const id = useAuthStore().user?.id
    if (!id) throw Object.assign(new Error('Debes iniciar sesión para continuar.'), { isFormError: true })
    return id
  }

  async function fetchNotifications() {
    loading.value = true
    error.value = null
    try {
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId())
        .order('created_at', { ascending: false })
      if (queryError) throw queryError
      notifications.value = data || []
      unreadCount.value = notifications.value.filter((n) => !n.is_read).length
      return { success: true, data: notifications.value }
    } catch (e) {
      return fail(e, 'fetchNotifications')
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId) {
    error.value = null
    try {
      const { data, error: queryError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('is_read', false)
        .select()
      if (queryError) throw queryError
      // Solo descuenta si la fila realmente pasó de no leída a leída.
      if (data?.length) {
        const row = notifications.value.find((n) => n.id === notificationId)
        if (row) row.is_read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      return { success: true, data: data?.[0] }
    } catch (e) {
      return fail(e, 'markAsRead')
    }
  }

  async function markAllAsRead() {
    error.value = null
    try {
      const { error: queryError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId())
        .eq('is_read', false)
      if (queryError) throw queryError
      notifications.value.forEach((n) => { n.is_read = true })
      unreadCount.value = 0
      return { success: true }
    } catch (e) {
      return fail(e, 'markAllAsRead')
    }
  }

  function subscribeToRealtime() {
    try {
      const userId = currentUserId()
      unsubscribeFromRealtime() // evita canales duplicados al re-loguear
      realtimeChannel.value = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId },
          (payload) => {
            notifications.value.unshift(payload.new)
            unreadCount.value += 1
          }
        )
        .subscribe()
      return { success: true }
    } catch (e) {
      return fail(e, 'subscribeToRealtime')
    }
  }

  function unsubscribeFromRealtime() {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
    return { success: true }
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    realtimeChannel,
    hasUnread,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    subscribeToRealtime,
    unsubscribeFromRealtime
  }
})
