# uni-chamada

O projeto é um sistema de registro de presença em aulas com foco em agilidade e antifraude, criado a partir de uma dor relatada por uma nova docente da Unifesp. A chamada oral tradicional consome tempo de aula e a por lista é facilmente burlada, com alunos registrando presença por colegas ausentes. A proposta é digitalizar esse processo garantindo que o registro só seja possível por quem está efetivamente em sala. Para isso, o sistema une a agilidade do QR Code, que é renovado a cada poucos segundos, à validação dos registros por localização e device fingerprint, além de integrar-se à API pública de consulta de alunos da Unifesp para obter fotos e dados dos estudantes.

**Produção:** https://unichamada.marquesdev.com

## Stack

- **Backend:** NestJS, TypeScript, Prisma, PostgreSQL
- **Frontend:** React, TypeScript, Vite
- **Infra:** Docker Compose, GitHub Actions (runner self-hosted) e GHCR,
  com deploy em servidor caseiro ARM
- **Storage:** Garage (S3-compatível self-hosted), para armazenar imagem e servir através de por URL pré-assinada

## Como rodar

### Com Docker (recomendado)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up --build
```

As migrations e o seed rodam automaticamente na subida do backend.

- Frontend: http://localhost:5173
- API: http://localhost:3000

### Localmente

Suba apenas o banco:

```bash
docker compose up -d postgres
```

Ou, se preferir, tenha um PostgreSQL rodando na sua máquina e ajuste a env `DATABASE_URL` do backend para apontar para ele.

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Frontend (em outro terminal):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Testes

```bash
cd backend && npm test     # Jest
cd frontend && npm test    # Vitest
```