// Camada de acesso a dados (PostgreSQL). Consulte lib/db.ts para a conexão.
//
// Modelo:
//   users       — login e papel (admin | user)
//   registros   — ponto: cada entrada/saída com data-hora
//   modalidade  — como o funcionário trabalhou em cada dia (uma por dia)

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

/** Lista os funcionários (usuários comuns), para o painel admin. */
export async function getFuncionarios(): Promise<User[]> {
  return query<User>(
    `SELECT id, name, email, senha AS password, role, image_url AS image
       FROM users
      WHERE role = 'user'
      ORDER BY name`
  );
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
