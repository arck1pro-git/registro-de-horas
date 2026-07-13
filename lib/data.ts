// Camada de acesso a dados (PostgreSQL). Consulte lib/db.ts para a conexão.
//
// Modelo:
//   users       — login e papel (admin | user)
//   registros   — ponto: cada entrada/saída com data-hora
//   modalidade  — como o funcionário trabalhou em cada dia (uma por dia)

import { randomUUID } from "crypto";
import { query } from "./db";

export type Role = "admin" | "user";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string; // coluna `senha`; texto puro no mock — trocar por hash
  role: Role;
  image: string | null; // coluna `image_url`; URL da foto de perfil
};

/** Tipo de registro de ponto. 'in' = entrada, 'out' = saída. */
export type RegistroTipo = "in" | "out";

export type Registro = {
  id: string;
  userId: string;
  tipo: RegistroTipo;
  timestamp: string; // ISO
};

export type ModalidadeTipo = "home_office" | "presencial";

export type Modalidade = {
  id: string;
  userId: string;
  tipo: ModalidadeTipo;
  dia: string; // "YYYY-MM-DD"
};

// --- Usuários -------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const rows = await query<User>(
    `SELECT id, name, email, senha AS password, role, image_url AS image
       FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [email]
  );
  return rows[0];
}

export async function findUserById(id: string): Promise<User | undefined> {
  const rows = await query<User>(
    `SELECT id, name, email, senha AS password, role, image_url AS image
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  return rows[0];
}

/**
 * Cria um usuário comum (role sempre 'user'). Lança { code: '23505' } se o
 * e-mail já existir (constraint UNIQUE) — trate na rota.
 */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (id, name, email, senha, role)
     VALUES ($1, $2, $3, $4, 'user')
     RETURNING id, name, email, senha AS password, role, image_url AS image`,
    [randomUUID(), input.name, input.email, input.password]
  );
  return rows[0];
}

/** Lista os funcionários (usuários comuns), para o painel admin. */
export async function getFuncionarios(): Promise<User[]> {
  return query<User>(
    `SELECT id, name, email, senha AS password, role, image_url AS image
       FROM users
      WHERE role = 'user'
      ORDER BY name`
  );
}

/**
 * Atualiza dados de um usuário (nome, e-mail e/ou senha). Só altera os campos
 * informados. Lança { code: '23505' } se o novo e-mail já existir. Retorna
 * undefined se o id não existir.
 */
export async function updateUser(
  id: string,
  fields: { name?: string; email?: string; password?: string }
): Promise<User | undefined> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.name !== undefined) {
    params.push(fields.name);
    sets.push(`name = $${params.length}`);
  }
  if (fields.email !== undefined) {
    params.push(fields.email);
    sets.push(`email = $${params.length}`);
  }
  if (fields.password !== undefined) {
    params.push(fields.password);
    sets.push(`senha = $${params.length}`);
  }
  if (sets.length === 0) return findUserById(id);

  params.push(id);
  const rows = await query<User>(
    `UPDATE users SET ${sets.join(", ")}
      WHERE id = $${params.length}
     RETURNING id, name, email, senha AS password, role, image_url AS image`,
    params
  );
  return rows[0];
}

/** Atualiza a URL da foto de perfil (passe null para remover). */
export async function updateUserImage(
  userId: string,
  imageUrl: string | null
): Promise<void> {
  await query(`UPDATE users SET image_url = $2 WHERE id = $1`, [
    userId,
    imageUrl,
  ]);
}

/**
 * Fuso horário (IANA) do usuário. Retorna 'America/Sao_Paulo' se a coluna ainda
 * não existir (migração não rodada) ou se estiver vazia.
 */
export async function getUserTimezone(userId: string): Promise<string> {
  try {
    const rows = await query<{ timezone: string | null }>(
      `SELECT timezone FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    return rows[0]?.timezone || "America/Sao_Paulo";
  } catch (err) {
    // 42703 = coluna inexistente: trata como padrão.
    if ((err as { code?: string })?.code === "42703") return "America/Sao_Paulo";
    throw err;
  }
}

/** Define o fuso horário (IANA) do usuário. */
export async function setUserTimezone(
  userId: string,
  timezone: string
): Promise<void> {
  await query(`UPDATE users SET timezone = $2 WHERE id = $1`, [
    userId,
    timezone,
  ]);
}

/** Salva (ou limpa, com null) o token FCM do usuário. Um dispositivo por usuário. */
export async function setFcmToken(
  userId: string,
  token: string | null
): Promise<void> {
  await query(`UPDATE users SET fcm_token = $2 WHERE id = $1`, [userId, token]);
}

/** Token FCM atual do usuário (null se notificações desativadas). */
export async function getFcmToken(userId: string): Promise<string | null> {
  try {
    const rows = await query<{ fcm_token: string | null }>(
      `SELECT fcm_token FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    return rows[0]?.fcm_token ?? null;
  } catch (err) {
    // 42703 = coluna inexistente: o ALTER TABLE ainda não foi rodado.
    // Não quebra a home; trata como "sem token".
    if ((err as { code?: string })?.code === "42703") return null;
    throw err;
  }
}

// --- Registros de ponto ---------------------------------------------------

type RegistroRow = {
  id: string;
  userId: string;
  tipo: RegistroTipo;
  timestamp: Date;
};

function toRegistro(row: RegistroRow): Registro {
  return {
    id: row.id,
    userId: row.userId,
    tipo: row.tipo,
    timestamp: new Date(row.timestamp).toISOString(),
  };
}

export async function getRegistrosByUser(userId: string): Promise<Registro[]> {
  const rows = await query<RegistroRow>(
    `SELECT id, user_id AS "userId", tipo, timestamp
       FROM registros
      WHERE user_id = $1
      ORDER BY timestamp ASC`,
    [userId]
  );
  return rows.map(toRegistro);
}

export async function addRegistro(
  userId: string,
  tipo: RegistroTipo
): Promise<Registro> {
  return addRegistroAt(userId, tipo, new Date().toISOString());
}

/** Insere um registro com data/hora específica (usado pelo admin). */
export async function addRegistroAt(
  userId: string,
  tipo: RegistroTipo,
  timestamp: string
): Promise<Registro> {
  const rows = await query<RegistroRow>(
    `INSERT INTO registros (user_id, tipo, timestamp)
     VALUES ($1, $2, $3)
     RETURNING id, user_id AS "userId", tipo, timestamp`,
    [userId, tipo, timestamp]
  );
  return toRegistro(rows[0]);
}

/**
 * Atualiza tipo e/ou data-hora de um registro existente (edição pelo admin).
 * Retorna undefined se o id não existir.
 */
export async function updateRegistro(
  id: string,
  fields: { tipo?: RegistroTipo; timestamp?: string }
): Promise<Registro | undefined> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.tipo) {
    params.push(fields.tipo);
    sets.push(`tipo = $${params.length}`);
  }
  if (fields.timestamp) {
    params.push(fields.timestamp);
    sets.push(`timestamp = $${params.length}`);
  }
  if (sets.length === 0) return undefined;

  params.push(id);
  const rows = await query<RegistroRow>(
    `UPDATE registros SET ${sets.join(", ")}
      WHERE id = $${params.length}
     RETURNING id, user_id AS "userId", tipo, timestamp`,
    params
  );
  return rows[0] ? toRegistro(rows[0]) : undefined;
}

/** Remove um registro (usado pelo admin). */
export async function deleteRegistro(id: string): Promise<void> {
  await query(`DELETE FROM registros WHERE id = $1`, [id]);
}

// --- Modalidade por dia ---------------------------------------------------

export async function getModalidadesByUser(
  userId: string
): Promise<Modalidade[]> {
  return query<Modalidade>(
    `SELECT id, user_id AS "userId", tipo, to_char(dia, 'YYYY-MM-DD') AS dia
       FROM modalidade
      WHERE user_id = $1
      ORDER BY dia ASC`,
    [userId]
  );
}

/** Modalidade de um dia específico (se houver). */
export async function getModalidadeForDay(
  userId: string,
  dia: string // "YYYY-MM-DD"
): Promise<Modalidade | undefined> {
  const rows = await query<Modalidade>(
    `SELECT id, user_id AS "userId", tipo, to_char(dia, 'YYYY-MM-DD') AS dia
       FROM modalidade
      WHERE user_id = $1 AND dia = $2
      LIMIT 1`,
    [userId, dia]
  );
  return rows[0];
}

/** Remove a modalidade de um dia (usado ao apagar o dia inteiro no admin). */
export async function deleteModalidade(
  userId: string,
  dia: string // "YYYY-MM-DD"
): Promise<void> {
  await query(`DELETE FROM modalidade WHERE user_id = $1 AND dia = $2`, [
    userId,
    dia,
  ]);
}

/** Marca a modalidade de um dia (uma por dia — remarcar sobrescreve). */
export async function setModalidade(
  userId: string,
  tipo: ModalidadeTipo,
  dia: string // "YYYY-MM-DD"
): Promise<Modalidade> {
  const rows = await query<Modalidade>(
    `INSERT INTO modalidade (user_id, tipo, dia)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, dia) DO UPDATE SET tipo = EXCLUDED.tipo
     RETURNING id, user_id AS "userId", tipo, to_char(dia, 'YYYY-MM-DD') AS dia`,
    [userId, tipo, dia]
  );
  return rows[0];
}
