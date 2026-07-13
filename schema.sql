-- Schema do "Registro de Horas" (PostgreSQL 13+).
-- Aplique com:  npm run db:setup   (aplica este arquivo e popula dados demo)
-- ou manualmente:  psql "$DATABASE_URL" -f schema.sql
--
-- Convenção de vocabulário (os códigos batem com o app):
--   registros.tipo   'in'  = entrada   |  'out' = saída
--   modalidade.tipo  'home_office'     |  'presencial'

-- ---------------------------------------------------------------------------
-- Usuários (login + papel). `senha` em texto puro apenas no mock —
-- trocar por hash (ex.: pgcrypto/bcrypt) num ambiente real.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  senha     TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  image_url TEXT
);

-- Token FCM (push) do funcionário — um dispositivo por usuário. NULL = notificações
-- desativadas. O envio é feito externamente (n8n) lendo esta coluna.
-- Via ALTER (idempotente) para atualizar bancos já existentes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Fuso horário do usuário (IANA, ex.: 'America/Sao_Paulo'). Usado para exibir e
-- agrupar por dia os registros DESSA pessoa. Padrão = São Paulo.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- ---------------------------------------------------------------------------
-- Registros de ponto: cada entrada/saída é uma linha com data-hora.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL CHECK (tipo IN ('in', 'out')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registros_user_ts_idx
  ON registros (user_id, timestamp);

-- ---------------------------------------------------------------------------
-- Modalidade por dia: como o funcionário trabalhou naquele dia.
-- Uma linha por (usuário, dia) — remarcar sobrescreve (UPSERT).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modalidade (
  id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo    TEXT NOT NULL CHECK (tipo IN ('home_office', 'presencial')),
  dia     DATE NOT NULL,
  UNIQUE (user_id, dia)
);

CREATE INDEX IF NOT EXISTS modalidade_user_dia_idx
  ON modalidade (user_id, dia);

-- ---------------------------------------------------------------------------
-- Contas iniciais (todas com senha 123456). Idempotente.
-- ---------------------------------------------------------------------------
INSERT INTO users (id, name, email, senha, role) VALUES
  ('1',  'Funcionário Demo', 'demo@ponto.com',  '123456', 'user'),
  ('2',  'Maria Souza',      'maria@ponto.com', '123456', 'user'),
  ('99', 'Admin',            'admin@ponto.com', '123456', 'admin')
ON CONFLICT (id) DO NOTHING;
