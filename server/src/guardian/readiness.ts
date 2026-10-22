import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Database } from '../db.js';

export const GUARDIAN_HOLD_VERSION = 'prelaunch-hold-1';
export const REQUIRED_GUARDIAN_CONTROLS = [
  'legal_basis_and_ghana_review',
  'age_assurance',
  'guardian_authority_verification',
  'purpose_scoped_consent_and_withdrawal',
  'child_identity_minimisation',
  'safeguarding_response',
  'retention_access_and_erasure',
  'independent_security_review',
] as const;

/** Planning metadata only; no identity proof, child profile or consent can be submitted. */
export async function migrateGuardianGroundwork(db: Database) {
  const sql = await readFile(
    resolve(process.cwd(), 'server/migrations/003_guardian_groundwork.sql'),
    'utf8',
  );
  await db.query(sql);
  return verifyGuardianHold(db);
}

export async function verifyGuardianHold(db: Database) {
  const gate = await db.query<{
    policy_version: string;
    child_accounts_enabled: boolean;
    child_data_collection_enabled: boolean;
    minor_learning_enabled: boolean;
  }>(
    `SELECT policy_version,child_accounts_enabled,child_data_collection_enabled,
            minor_learning_enabled FROM safeguarding.release_gate WHERE id='minor_access'`,
  );
  const controls = await db.query<{ code: string; state: string }>(
    'SELECT code,state FROM safeguarding.required_controls ORDER BY code',
  );
  const row = gate.rows[0];
  const expected = [...REQUIRED_GUARDIAN_CONTROLS].sort();
  if (
    gate.rowCount !== 1 ||
    !row ||
    row.policy_version !== GUARDIAN_HOLD_VERSION ||
    row.child_accounts_enabled ||
    row.child_data_collection_enabled ||
    row.minor_learning_enabled ||
    controls.rows.length !== expected.length ||
    controls.rows.some(
      (control, index) => control.code !== expected[index] || control.state !== 'not_ready',
    )
  )
    throw new Error(
      'Safeguarding hold is missing or has changed; refuse the adult engine startup.',
    );
  return {
    policyVersion: row.policy_version,
    childAccountsEnabled: false as const,
    childDataCollectionEnabled: false as const,
    minorLearningEnabled: false as const,
    requirements: controls.rows,
    readiness: 'blocked_pending_legal_privacy_and_safeguarding_review' as const,
  };
}
