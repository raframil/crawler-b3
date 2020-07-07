
-- Table demonstrativo-de-resultado
CREATE TABLE IF NOT EXISTS "demonstrativo-de-resultado" (
  "id" SERIAL NOT NULL,
  "codigoEmpresa" TEXT NULL,
  "codigoConta1" VARCHAR(4) NULL,
  "codigoConta2" VARCHAR(4) NULL,
  "codigoConta3" VARCHAR(4) NULL,
  "descrição" TEXT NULL,
  "valor" TEXT NULL,
  "ano" VARCHAR(4) NULL,
  PRIMARY KEY ("id"));

-- Table balanco-patrimonial-ativo
CREATE TABLE IF NOT EXISTS "balanco-patrimonial-ativo" (
  "id" SERIAL NOT NULL,
  "codigoEmpresa" TEXT NULL,
  "codigoConta1" VARCHAR(4) NULL,
  "codigoConta2" VARCHAR(4) NULL,
  "codigoConta3" VARCHAR(4) NULL,
  "descrição" TEXT NULL,
  "valor" TEXT NULL,
  "ano" VARCHAR(4) NULL,
  PRIMARY KEY ("id"));

-- Table balanco-patrimonial-passivo
CREATE TABLE IF NOT EXISTS "balanco-patrimonial-passivo" (
  "id" SERIAL NOT NULL,
  "codigoEmpresa" TEXT NULL,
  "codigoConta1" VARCHAR(4) NULL,
  "codigoConta2" VARCHAR(4) NULL,
  "codigoConta3" VARCHAR(4) NULL,
  "descrição" TEXT NULL,
  "valor" TEXT NULL,
  "ano" VARCHAR(4) NULL,
  PRIMARY KEY ("id"));

-- Table demonstracao-fluxo-caixa
CREATE TABLE IF NOT EXISTS "demonstracao-fluxo-caixa" (
  "id" SERIAL NOT NULL,
  "codigoEmpresa" TEXT NULL,
  "codigoConta1" VARCHAR(4) NULL,
  "codigoConta2" VARCHAR(4) NULL,
  "codigoConta3" VARCHAR(4) NULL,
  "descrição" TEXT NULL,
  "valor" TEXT NULL,
  "ano" VARCHAR(4) NULL,
  PRIMARY KEY ("id"));
