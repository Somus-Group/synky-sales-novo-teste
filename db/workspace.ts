import type { ChatGPTUser } from '@/app/chatgpt-auth';
import { getD1 } from '@/db';

export type PipelineCompany = { id: string; name: string; createdAt: number };

const defaultCompanyId = (workspaceId: string) => `${workspaceId}:company:default`;
let workspaceSchemaPromise: Promise<void> | null = null;

async function ensureColumn(table: string, column: string, definition: string) {
  const db = getD1();
  const columns = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!columns.results.some((item) => item.name === column)) {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${definition}`).run();
  }
}

async function ensureWorkspaceSchema() {
  if (!workspaceSchemaPromise) {
    workspaceSchemaPromise = (async () => {
      const db = getD1();
      await db.batch([
        db.prepare('CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, owner_user_id TEXT NOT NULL, created_at INTEGER NOT NULL)'),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_owner_user_id ON workspaces (owner_user_id)'),
        db.prepare("CREATE TABLE IF NOT EXISTS opportunities (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, workspace_id TEXT NOT NULL, company_id TEXT NOT NULL DEFAULT '', client_name TEXT NOT NULL, project_name TEXT NOT NULL, value_cents INTEGER NOT NULL, stage TEXT NOT NULL, next_action TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'Não informado', tags_json TEXT NOT NULL DEFAULT '[]', custom_fields_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))"),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_stage ON opportunities (workspace_id, stage)'),
        db.prepare("CREATE TABLE IF NOT EXISTS proposals (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, workspace_id TEXT NOT NULL, code TEXT NOT NULL, client_name TEXT NOT NULL, project_name TEXT NOT NULL, value_cents INTEGER NOT NULL, status TEXT NOT NULL, validity TEXT NOT NULL, template TEXT NOT NULL, slug TEXT NOT NULL, brief_json TEXT NOT NULL DEFAULT '{}', content_json TEXT NOT NULL DEFAULT '{}', agent_status TEXT NOT NULL DEFAULT 'ready', created_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))"),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_proposals_workspace_status ON proposals (workspace_id, status)'),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_workspace_code ON proposals (workspace_id, code)'),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_slug ON proposals (slug)'),
        db.prepare('CREATE TABLE IF NOT EXISTS workspace_members (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, workspace_id TEXT NOT NULL, user_id TEXT, name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, invited_by_user_id TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))'),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_workspace_email ON workspace_members (workspace_id, email)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON workspace_members (email)'),
        db.prepare("CREATE TABLE IF NOT EXISTS agent_profiles (workspace_id TEXT PRIMARY KEY NOT NULL, business_name TEXT NOT NULL, legal_name TEXT NOT NULL DEFAULT '', segment TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', instagram TEXT NOT NULL DEFAULT '', primary_color TEXT NOT NULL DEFAULT '#0B6FE8', secondary_color TEXT NOT NULL DEFAULT '#0757C8', services_json TEXT NOT NULL, audience TEXT NOT NULL, tone TEXT NOT NULL, differentiators TEXT NOT NULL, proposal_structure TEXT NOT NULL, instructions TEXT NOT NULL, status TEXT NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))"),
        db.prepare("CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, workspace_id TEXT NOT NULL, name TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', document TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Ativo', contract_value_cents INTEGER NOT NULL DEFAULT 0, tags_json TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '', custom_fields_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))"),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_clients_workspace_status ON clients (workspace_id, status)'),
        db.prepare("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, workspace_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Entrada', priority TEXT NOT NULL DEFAULT 'Média', due_date TEXT NOT NULL DEFAULT '', assignee TEXT NOT NULL DEFAULT '', project TEXT NOT NULL DEFAULT '', completed_at INTEGER, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))"),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_position ON tasks (workspace_id, status, position)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due_date ON tasks (workspace_id, due_date)'),
        db.prepare('CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))'),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_workspace_name ON companies (workspace_id, name)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_companies_workspace ON companies (workspace_id)'),
        db.prepare('CREATE TABLE IF NOT EXISTS pipeline_settings (company_id TEXT PRIMARY KEY NOT NULL, labels_json TEXT NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (company_id) REFERENCES companies(id))'),
        db.prepare("CREATE TABLE IF NOT EXISTS brand_assets (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, workspace_id TEXT NOT NULL, public_token TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', object_key TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))"),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_brand_assets_workspace_kind ON brand_assets (workspace_id, kind)'),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_assets_public_token ON brand_assets (public_token)'),
        db.prepare('CREATE TABLE IF NOT EXISTS proposal_references (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, workspace_id TEXT NOT NULL, name TEXT NOT NULL, object_key TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_proposal_references_workspace ON proposal_references (workspace_id)'),
      ]);

      await ensureColumn('opportunities', 'source', "source TEXT NOT NULL DEFAULT 'Não informado'");
      await ensureColumn('opportunities', 'tags_json', "tags_json TEXT NOT NULL DEFAULT '[]'");
      await ensureColumn('opportunities', 'custom_fields_json', "custom_fields_json TEXT NOT NULL DEFAULT '{}'");
      await ensureColumn('opportunities', 'updated_at', 'updated_at INTEGER NOT NULL DEFAULT 0');
      await ensureColumn('opportunities', 'company_id', "company_id TEXT NOT NULL DEFAULT ''");
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_opportunities_company_stage ON opportunities (company_id, stage)').run();
      await ensureColumn('proposals', 'brief_json', "brief_json TEXT NOT NULL DEFAULT '{}'");
      await ensureColumn('proposals', 'content_json', "content_json TEXT NOT NULL DEFAULT '{}'");
      await ensureColumn('proposals', 'agent_status', "agent_status TEXT NOT NULL DEFAULT 'ready'");
      await ensureColumn('agent_profiles', 'legal_name', "legal_name TEXT NOT NULL DEFAULT ''");
      await ensureColumn('agent_profiles', 'description', "description TEXT NOT NULL DEFAULT ''");
      await ensureColumn('agent_profiles', 'website', "website TEXT NOT NULL DEFAULT ''");
      await ensureColumn('agent_profiles', 'email', "email TEXT NOT NULL DEFAULT ''");
      await ensureColumn('agent_profiles', 'phone', "phone TEXT NOT NULL DEFAULT ''");
      await ensureColumn('agent_profiles', 'address', "address TEXT NOT NULL DEFAULT ''");
      await ensureColumn('agent_profiles', 'instagram', "instagram TEXT NOT NULL DEFAULT ''");
      await ensureColumn('agent_profiles', 'primary_color', "primary_color TEXT NOT NULL DEFAULT '#0B6FE8'");
      await ensureColumn('agent_profiles', 'secondary_color', "secondary_color TEXT NOT NULL DEFAULT '#0757C8'");
    })().catch((error) => {
      workspaceSchemaPromise = null;
      throw error;
    });
  }
  await workspaceSchemaPromise;
}

async function ensureDefaultPipelineCompany(workspaceId: string) {
  const db = getD1();
  const id = defaultCompanyId(workspaceId);
  await db.prepare('INSERT OR IGNORE INTO companies (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, workspaceId, 'Empresa principal', Date.now()).run();
  // Existing opportunities belong to the first company after the migration.
  await db.prepare("UPDATE opportunities SET company_id = ? WHERE workspace_id = ? AND company_id = ''")
    .bind(id, workspaceId).run();
  return id;
}

export async function getWorkspaceForUser(user: ChatGPTUser) {
  await ensureWorkspaceSchema();
  const db = getD1();
  const email = user.email.trim().toLowerCase();
  const membership = await db.prepare('SELECT workspace_id AS workspaceId FROM workspace_members WHERE lower(email) = ? ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, id ASC LIMIT 1')
    .bind(email, user.userId).first<{ workspaceId: string }>();

  if (membership) {
    await db.prepare('UPDATE workspace_members SET user_id = ?, status = ? WHERE workspace_id = ? AND lower(email) = ?')
      .bind(user.userId, 'Ativo', membership.workspaceId, email).run();
    return membership.workspaceId;
  }

  const workspaceId = `workspace:${user.userId}`;
  await db.prepare('INSERT OR IGNORE INTO workspaces (id, name, owner_user_id, created_at) VALUES (?, ?, ?, ?)')
    .bind(workspaceId, 'Somus Group', user.userId, Date.now()).run();
  await db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, name, email, role, status, invited_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(workspaceId, user.userId, user.fullName || user.displayName || email.split('@')[0], email, 'Proprietário', 'Ativo', user.userId, Date.now()).run();
  return workspaceId;
}

export async function getPipelineCompanyForUser(user: ChatGPTUser, requestedCompanyId?: string | null) {
  const workspaceId = await getWorkspaceForUser(user);
  const fallbackId = await ensureDefaultPipelineCompany(workspaceId);
  const requestedId = requestedCompanyId?.trim();
  if (requestedId) {
    const company = await getD1().prepare('SELECT id, name, created_at AS createdAt FROM companies WHERE id = ? AND workspace_id = ? LIMIT 1')
      .bind(requestedId, workspaceId).first<PipelineCompany>();
    if (company) return { workspaceId, company };
  }
  const company = await getD1().prepare('SELECT id, name, created_at AS createdAt FROM companies WHERE id = ? LIMIT 1')
    .bind(fallbackId).first<PipelineCompany>();
  if (!company) throw new Error('Não foi possível preparar a empresa principal.');
  return { workspaceId, company };
}

export async function listPipelineCompaniesForUser(user: ChatGPTUser) {
  const workspaceId = await getWorkspaceForUser(user);
  await ensureDefaultPipelineCompany(workspaceId);
  const result = await getD1().prepare('SELECT id, name, created_at AS createdAt FROM companies WHERE workspace_id = ? ORDER BY created_at ASC, name ASC')
    .bind(workspaceId).all<PipelineCompany>();
  return result.results;
}

export async function createPipelineCompanyForUser(user: ChatGPTUser, name: string) {
  const workspaceId = await getWorkspaceForUser(user);
  await ensureDefaultPipelineCompany(workspaceId);
  const normalizedName = name.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!normalizedName) throw new Error('Informe o nome da empresa.');
  const existing = await getD1().prepare('SELECT id FROM companies WHERE workspace_id = ? AND lower(name) = lower(?) LIMIT 1')
    .bind(workspaceId, normalizedName).first<{ id: string }>();
  if (existing) throw new Error('Já existe uma empresa com este nome.');
  const company: PipelineCompany = { id: `company:${crypto.randomUUID()}`, name: normalizedName, createdAt: Date.now() };
  await getD1().prepare('INSERT INTO companies (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)')
    .bind(company.id, workspaceId, company.name, company.createdAt).run();
  return company;
}

export async function renamePipelineCompanyForUser(user: ChatGPTUser, companyId: string, name: string) {
  const workspaceId = await getWorkspaceForUser(user);
  await ensureDefaultPipelineCompany(workspaceId);
  const normalizedName = name.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!normalizedName) throw new Error('Informe o nome da empresa.');
  const current = await getD1().prepare('SELECT id, name, created_at AS createdAt FROM companies WHERE id = ? AND workspace_id = ? LIMIT 1')
    .bind(companyId, workspaceId).first<PipelineCompany>();
  if (!current) throw new Error('Empresa não encontrada.');
  const existing = await getD1().prepare('SELECT id FROM companies WHERE workspace_id = ? AND lower(name) = lower(?) AND id <> ? LIMIT 1')
    .bind(workspaceId, normalizedName, companyId).first<{ id: string }>();
  if (existing) throw new Error('Já existe uma empresa com este nome.');
  await getD1().prepare('UPDATE companies SET name = ? WHERE id = ? AND workspace_id = ?')
    .bind(normalizedName, companyId, workspaceId).run();
  return { ...current, name: normalizedName };
}
