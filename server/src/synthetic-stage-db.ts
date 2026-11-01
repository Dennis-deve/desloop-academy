import type { Database } from './db.js';

/** A production synthetic web service must never start on an admin, non-TLS or wrong DB. */
export async function verifySyntheticStageDatabase(db: Database): Promise<void> {
  const result = await db.query<{
    database: string; role: string; tls: boolean;
    superuser: boolean; create_role: boolean; create_db: boolean;
    bypass_rls: boolean; neon_admin: boolean; schema_create: boolean;
    child_write: boolean; account_role_write: boolean;
  }>(`SELECT current_database() AS database, current_user AS role,
      (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls,
      r.rolsuper AS superuser, r.rolcreaterole AS create_role,
      r.rolcreatedb AS create_db, r.rolbypassrls AS bypass_rls,
      coalesce(pg_has_role(current_user,
        (SELECT oid FROM pg_roles WHERE rolname='neon_superuser'), 'member'), false) AS neon_admin,
      has_schema_privilege(current_user,'project_core','CREATE') AS schema_create,
      has_table_privilege(current_user,'safeguarding.release_gate','UPDATE') AS child_write,
      has_column_privilege(current_user,'pilot.users','role','UPDATE') AS account_role_write
    FROM pg_roles r WHERE r.rolname=current_user`);
  const row = result.rows[0];
  if (result.rowCount !== 1 || !row ||
      row.database !== 'desloop_synthetic_stage' ||
      row.role !== 'desloop_stage_runtime' || !row.tls ||
      row.superuser || row.create_role || row.create_db || row.bypass_rls ||
      row.neon_admin || row.schema_create || row.child_write || row.account_role_write)
    throw new Error('Synthetic stage database identity, verified transport or least-privilege role check failed');
}
