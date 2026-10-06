export { DEFAULT_CONFIG, resolveConfig, storageKeys, type WasichaiConfig, type StorageKeys } from './app/config'
export {
  ApiError,
  api,
  createApiClient,
  getActiveApiClient,
  getToken,
  setToken,
  type ApiClient,
  type ApiClientOptions,
  type FieldViolation
} from './api/client'
export * from './types/metadata'
export { buildRecordSchema, toAttributes, toFormValues } from './lib/metadata-to-zod'
export type { AuthUser, CallerPermissions } from './types/auth'
export type { AuditChange, AuditEntry, AuditEntryPayload, AuditFilters, AuditOperation, ChangeDescription } from './types/audit'
export type * from './registry/contract'
export {
  CORE_HISTORY_OPERATIONS,
  CORE_PAGE_ACTIONS,
  RegistryError,
  createRegistry,
  type WasichaiRegistry,
  type ResolvedNavGroup,
  type ResolvedNavItem,
  type ResolvedRoute
} from './registry/createRegistry'
export { fillPath, joinPath } from './links/paths'
export { CORE_MODULE_ID, CORE_ROUTE_PATHS, createLinks, type WasichaiLinks, type WasichaiRouteMap, type CoreRouteId } from './links/links'
export { CORE_NAMESPACE, changeLanguage, createWasichaiI18n, type WasichaiI18nOptions } from './i18n/createI18n'
export { useApiClient, useWasichai, useWasichaiConfig, useWasichaiLinks, useRegistry, type WasichaiContextValue } from './app/context'
export { AuthProvider, useAuth, type AuthContextValue, type AuthProviderProps } from './auth/AuthProvider'
export { WasichaiProviders, type WasichaiProvidersProps } from './app/WasichaiProviders'
export { ThemeProvider, useTheme, type ThemeContextValue } from './theme/ThemeProvider'
export { availableThemes, resolveTheme, BUILT_IN_THEMES, PORTAL_TRIBUTARIO_THEME, SYSTEM_THEME, type ThemeDefinition } from './theme/themes'
export { usePreferences, useUpdatePreferences, useSetLocale, type UserPreferences } from './preferences/preferences'
export { useObjectFlags } from './registry/hooks'
export * from './queries'
export { PageHeader } from './shell/PageHeader'
export { AppShell } from './shell/AppShell'
export { currentNavTreeLeaf, isNavTreeGroup, navTreeLeaves, type NavTreeGroup, type NavTreeLeaf, type NavTreeNode } from './shell/navTreeNodes'
export { AuthGate } from './app/AuthGate'
export { WasichaiRoutes } from './app/WasichaiRoutes'
export { coreModule } from './app/coreModule'
export { WasichaiApp, type WasichaiAppProps } from './app/WasichaiApp'
export { LoginPage } from './auth/LoginPage'
export { DashboardPage } from './features/dashboard/DashboardPage'
export { DataTable, type DataTableProps } from './components/data-table/DataTable'
export { DynamicForm, type DynamicFormProps } from './components/dynamic-form/DynamicForm'
export { FieldInput } from './components/dynamic-form/fields/FieldInput'
export { RelationField } from './components/dynamic-form/fields/RelationField'
export { RelatedList } from './components/related/RelatedList'
export {
  EmptyState,
  ErrorState,
  LoadingState,
  QueryState,
  type EmptyStateProps,
  type ErrorStateProps,
  type LoadingStateProps,
  type QueryStateProps
} from './components/query-state/QueryState'
export { absoluteTime, describeChanges, formatAuditValue, NO_AUDIT_EXTENSIONS, relativeTime, type AuditExtensions } from './features/history/changes'
export { useAuditExtensions } from './features/history/useAuditExtensions'
export { useAuditLog, useRecordHistory } from './features/history/api'
export { ChangeList } from './features/history/ChangeList'
export { OperationBadge } from './features/history/OperationBadge'
export { RecordHistory } from './features/history/RecordHistory'
export { PageRenderer, type PageRendererProps } from './components/page-renderer/PageRenderer'
export { ActionButton } from './components/page-renderer/ActionButton'
export { ROW_CLASS, regionKeys, regionStyle } from './components/page-renderer/layout'
export { fallbackPage } from './components/page-renderer/fallbackPage'
export { effectiveSort, fallbackView, pickView, viewColumns, viewQueryParams, type ListQuery } from './features/records/viewColumns'
export { RecordListPage } from './features/records/RecordListPage'
export { RecordFormPage } from './features/records/RecordFormPage'
export { RecordDetailPage } from './features/records/RecordDetailPage'
export * from './features/objects'
export * from './features/admin'
export { RelationshipsPage } from './features/relationships/RelationshipsPage'
// workflow's inspector picks which roles may fire a transition
export { useRoles } from './features/admin/api'
