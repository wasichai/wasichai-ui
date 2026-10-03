// the admin screens own their strings; coreBundles merges them into common.
const es = {
  admin: {
    users: {
      title: 'Usuarios',
      subtitle: 'Altas, bajas y asignación de roles',
      new: 'Nuevo usuario',
      email: 'Correo',
      displayName: 'Nombre',
      password: 'Contraseña',
      newPassword: 'Nueva contraseña',
      passwordHint: 'Déjala vacía para no cambiarla',
      roles: 'Roles',
      noRoles: 'Sin roles',
      status: 'Estado',
      enabled: 'Activo',
      disabled: 'Inactivo',
      createdAt: 'Alta',
      empty: 'Todavía no hay usuarios',
      editing: 'Editando a {{name}}',
      self: 'Eres tú',
      selfHint: 'No puedes desactivarte ni eliminarte a ti mismo',
      confirmDelete: '¿Eliminar a {{name}}? Esta acción no se puede deshacer.'
    },
    roles: {
      title: 'Roles',
      subtitle: 'Qué puede hacer cada perfil dentro de la organización',
      new: 'Nuevo rol',
      name: 'Nombre técnico',
      nameHint: 'En mayúsculas, por ejemplo INSPECTOR',
      label: 'Etiqueta',
      ownRecordsOnly: 'Solo sus registros',
      ownRecordsOnlyHint: 'Este rol solo ve los registros que creó',
      permissionsCount: 'Permisos',
      fieldsCount: 'Campos restringidos',
      empty: 'Todavía no hay roles',
      edit: 'Editar rol',
      confirmDelete: '¿Eliminar el rol {{name}}?',
      adminProtected: 'ADMIN no se puede eliminar: es el rol que administra la organización.'
    },
    permissions: {
      title: 'Permisos',
      subtitle: 'Matriz de permisos por objeto y permisos de campo',
      role: 'Rol',
      selectRole: 'Elige un rol',
      noRole: 'Elige un rol para editar su matriz de permisos',
      matrix: 'Matriz de permisos',
      everyObject: 'Todos los objetos',
      everyObjectHint: 'Se aplica a cualquier objeto, presente o futuro',
      object: 'Objeto',
      notApplicable: 'No aplica por objeto',
      declaredActions: 'Acciones propias',
      declaredObjectOnly: 'Las acciones propias se conceden por objeto, nunca para todos',
      adminBanner: 'ADMIN omite todas las comprobaciones de permisos: editar esta matriz no cambia nada.',
      save: 'Guardar permisos',
      fieldPermissions: 'Permisos de campo',
      fieldPermissionsHint: 'Son una restricción, no una concesión: si un rol no tiene permisos de campo para un objeto, ve todos sus campos.',
      selectObject: 'Elige un objeto',
      field: 'Campo',
      read: 'Lectura',
      write: 'Escritura',
      noFields: 'Este objeto no tiene campos',
      saveFields: 'Guardar permisos de campo',
      unrestricted: 'Sin restricciones: este rol ve todos los campos de este objeto.'
    }
  }
}

const en = {
  admin: {
    users: {
      title: 'Users',
      subtitle: 'Accounts and role assignment',
      new: 'New user',
      email: 'Email',
      displayName: 'Name',
      password: 'Password',
      newPassword: 'New password',
      passwordHint: 'Leave empty to keep the current one',
      roles: 'Roles',
      noRoles: 'No roles',
      status: 'Status',
      enabled: 'Active',
      disabled: 'Inactive',
      createdAt: 'Created',
      empty: 'No users yet',
      editing: 'Editing {{name}}',
      self: 'This is you',
      selfHint: 'You cannot disable or delete yourself',
      confirmDelete: 'Delete {{name}}? This cannot be undone.'
    },
    roles: {
      title: 'Roles',
      subtitle: 'What each profile can do inside the organization',
      new: 'New role',
      name: 'Technical name',
      nameHint: 'Uppercase, for example INSPECTOR',
      label: 'Label',
      ownRecordsOnly: 'Own records only',
      ownRecordsOnlyHint: 'This role only sees the records it created',
      permissionsCount: 'Permissions',
      fieldsCount: 'Restricted fields',
      empty: 'No roles yet',
      edit: 'Edit role',
      confirmDelete: 'Delete role {{name}}?',
      adminProtected: 'ADMIN cannot be deleted: it is the role that administers the organization.'
    },
    permissions: {
      title: 'Permissions',
      subtitle: 'Permission matrix per object and field permissions',
      role: 'Role',
      selectRole: 'Pick a role',
      noRole: 'Pick a role to edit its permission matrix',
      matrix: 'Permission matrix',
      everyObject: 'Every object',
      everyObjectHint: 'Applies to any object, present or future',
      object: 'Object',
      notApplicable: 'Not per object',
      declaredActions: 'Own actions',
      declaredObjectOnly: 'Own actions are granted per object, never to every object',
      adminBanner: 'ADMIN bypasses every permission check: editing this matrix has no effect.',
      save: 'Save permissions',
      fieldPermissions: 'Field permissions',
      fieldPermissionsHint: 'They are a restriction, not a grant: a role with no field permissions for an object sees every field.',
      selectObject: 'Pick an object',
      field: 'Field',
      read: 'Read',
      write: 'Write',
      noFields: 'This object has no fields',
      saveFields: 'Save field permissions',
      unrestricted: 'Unrestricted: this role sees every field of this object.'
    }
  }
}

// merged into core's `common` namespace by createWasichaiI18n (coreBundles)
export const adminMessages = { es, en }
