import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, api } from '../api/client'
import { useApiClient } from '../app/context'
import { useAuth } from '../auth/AuthProvider'
import { changeLanguage } from '../i18n/createI18n'

export interface UserPreferences {
  theme: string
  locale: string | null
}

function preferencesKey(userId: string | null) {
  return ['auth', 'preferences', userId] as const
}

// null = the backend predates the endpoint (404): preferences stay in the browser
export function usePreferences() {
  const { user } = useAuth()
  return useQuery<UserPreferences | null, ApiError>({
    queryKey: preferencesKey(user?.id ?? null),
    queryFn: async () => {
      try {
        return await api<UserPreferences>('/auth/me/preferences')
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) return null
        throw cause
      }
    },
    enabled: user !== null
  })
}

export function useUpdatePreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = preferencesKey(user?.id ?? null)
  // resolves null on a 404: the backend predates the endpoint, so the caller keeps its pick local and
  // the cache turns null, which stops every later PUT (a pick can cancel the GET that would have said so)
  return useMutation<UserPreferences | null, ApiError, Partial<UserPreferences>, { previous?: UserPreferences | null }>({
    mutationFn: async (change) => {
      try {
        return await api<UserPreferences>('/auth/me/preferences', { method: 'PUT', body: JSON.stringify(change) })
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) return null
        throw cause
      }
    },
    // optimistic: the theme switches on click, not on the round trip
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<UserPreferences | null>(key)
      if (previous) queryClient.setQueryData(key, { ...previous, ...change })
      return { previous }
    },
    onError: (_error, _change, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (saved) => queryClient.setQueryData(key, saved)
  })
}

// the shell's language button: always local, and stored for the user when the backend can
export function useSetLocale(): (language: string) => Promise<void> {
  const { i18n } = useTranslation()
  const { keys } = useApiClient()
  const { user } = useAuth()
  const preferences = usePreferences()
  const update = useUpdatePreferences()
  return useCallback(
    async (language: string) => {
      const previous = i18n.language
      await changeLanguage(i18n, keys.lang, language)
      // signed out or confirmed 404: stay browser-only. pending or errored still gets a try, like the theme
      if (!user || preferences.data === null) return
      try {
        await update.mutateAsync({ locale: language })
      } catch (cause) {
        await changeLanguage(i18n, keys.lang, previous)
        throw cause
      }
    },
    [i18n, keys.lang, user, preferences.data, update.mutateAsync]
  )
}
