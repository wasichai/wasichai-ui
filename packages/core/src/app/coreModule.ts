import { Boxes, Database, FileStack, KeyRound, Shield, Users } from 'lucide-react'
import { LoginPage } from '../auth/LoginPage'
import { AuditPage } from '../features/admin/AuditPage'
import { PermissionsPage } from '../features/admin/PermissionsPage'
import { RolesPage } from '../features/admin/RolesPage'
import { UsersPage } from '../features/admin/UsersPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ObjectBuilderPage } from '../features/objects/ObjectBuilderPage'
import { ObjectEditorPage } from '../features/objects/ObjectEditorPage'
import { ObjectsPage } from '../features/objects/ObjectsPage'
import { RecordDetailPage } from '../features/records/RecordDetailPage'
import { RecordFormPage } from '../features/records/RecordFormPage'
import { RecordListPage } from '../features/records/RecordListPage'
import { RelationshipsPage } from '../features/relationships/RelationshipsPage'
import { CORE_MODULE_ID, CORE_ROUTE_PATHS } from '../links/links'
import type { WasichaiModule } from '../registry/contract'

// core is a module like the others: its screens, its sidebar. WasichaiApp registers it first.
// the builder and automation groups are declared here so every module that fills them shares one.
export const coreModule: WasichaiModule = {
  id: CORE_MODULE_ID,
  navGroups: [
    { id: 'data', labelKey: 'nav.data', order: 10 },
    { id: 'builder', labelKey: 'nav.builder', order: 30 },
    { id: 'automation', labelKey: 'nav.automation', order: 40 },
    { id: 'administration', labelKey: 'nav.administration', order: 50 }
  ],
  routes: [
    { id: 'login', path: CORE_ROUTE_PATHS.login, component: LoginPage, chrome: 'public' },
    { id: 'home', path: CORE_ROUTE_PATHS.home, component: DashboardPage },
    { id: 'objects', path: CORE_ROUTE_PATHS.objects, component: ObjectsPage },
    { id: 'newObject', path: CORE_ROUTE_PATHS.newObject, component: ObjectBuilderPage },
    { id: 'editObject', path: CORE_ROUTE_PATHS.editObject, component: ObjectEditorPage },
    { id: 'relationships', path: CORE_ROUTE_PATHS.relationships, component: RelationshipsPage },
    { id: 'records', path: CORE_ROUTE_PATHS.records, component: RecordListPage },
    { id: 'newRecord', path: CORE_ROUTE_PATHS.newRecord, component: RecordFormPage },
    { id: 'record', path: CORE_ROUTE_PATHS.record, component: RecordDetailPage },
    { id: 'users', path: CORE_ROUTE_PATHS.users, component: UsersPage },
    { id: 'roles', path: CORE_ROUTE_PATHS.roles, component: RolesPage },
    { id: 'permissions', path: CORE_ROUTE_PATHS.permissions, component: PermissionsPage },
    { id: 'audit', path: CORE_ROUTE_PATHS.audit, component: AuditPage }
  ],
  nav: [
    { group: 'data', labelKey: 'nav.objects', order: 10, icon: Boxes, route: 'objects' },
    { group: 'data', labelKey: 'nav.records', order: 20, icon: Database, disabled: true },
    { group: 'data', labelKey: 'nav.relationships', order: 30, icon: FileStack, route: 'relationships' },
    { group: 'administration', labelKey: 'nav.users', order: 10, icon: Users, route: 'users' },
    { group: 'administration', labelKey: 'nav.roles', order: 20, icon: Shield, route: 'roles' },
    { group: 'administration', labelKey: 'nav.permissions', order: 30, icon: KeyRound, route: 'permissions' },
    { group: 'administration', labelKey: 'nav.audit', order: 40, route: 'audit' }
  ]
}
