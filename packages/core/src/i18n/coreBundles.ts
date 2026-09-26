import { adminMessages } from '../features/admin/i18n'
import { historyMessages } from '../features/history/i18n'

// strings a core feature keeps outside common.json, deep-merged into `common` when an app starts.
// a feature adds its bundle here instead of registering it by an import side effect.
export const coreBundles: Record<string, Record<string, unknown>>[] = [historyMessages, adminMessages]
