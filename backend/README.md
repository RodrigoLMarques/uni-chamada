# backend

API do uni-chamada: NestJS 12, Prisma 7, Postgres 18.

## Rodando

Tudo em container, na raiz do repo:

```bash
docker compose up -d --build
```

A API sobe em `http://localhost:3000`. No boot o container já aplica as
migrations, gera o client do Prisma e roda o seed. Salvar um arquivo em
`src/` recompila sozinho em ~2s.

```bash
docker compose logs -f backend   # logs
docker compose down              # derruba
docker compose down -v           # derruba e apaga o banco
```

Se mexeu nas dependências, precisa renovar:

```bash
docker compose up -d --build --renew-anon-volumes backend
```

Se preferir a API no host (precisa de Node >= 24.9):

```bash
docker compose up -d postgres
npm install
npm run start:dev
```

## Testes

```bash
npm test          # unitários
npm run test:e2e  # CRUD de verdade, precisa do postgres no ar
npm run test:cov  # cobertura
```

O e2e cria e apaga os próprios registros, dá para rodar à vontade.

## Banco (Prisma)

Schema em `prisma/schema.prisma`, conexão pela `DATABASE_URL` (veja
`.env.example`).

```bash
npm run prisma:migrate    # cria e aplica migration (pede um nome)
npm run prisma:generate   # regenera o client depois de mudar o schema
npm run prisma:seed       # recria os usuários de exemplo
```

Usuários do seed, senha `123456` nos dois: `teacher@unifesp.br` e
`teacher2@unifesp.br`.

## Turmas e matrículas

Tudo exige token e é escopado ao teacher logado: turma de outro teacher
responde `404`, não `403`.

| Rota | O que faz |
|---|---|
| `POST /courses` | cria turma (`code`, `name`, `term`, `period`) |
| `GET /courses` | lista as suas (`?query`, `?term`, `?period`) |
| `GET /courses/:id` | busca |
| `PATCH /courses/:id` | atualiza |
| `DELETE /courses/:id` | apaga a turma e as matrículas dela |
| `POST /courses/:id/enrollments` | matricula por `ra` + `name` |
| `GET /courses/:id/enrollments` | lista os alunos matriculados (`?query`, `?status`) |
| `PATCH /courses/:id/enrollments/:studentId` | muda `status` |
| `DELETE /courses/:id/enrollments/:studentId` | remove a matrícula |

`period` é `FULL_TIME` ou `EVENING`, e entra na chave única junto com
teacher, código e semestre — então o mesmo código no mesmo semestre em
períodos diferentes são turmas distintas.

O aluno é identificado pelo RA e não faz login. Além de `ra` e `name`, a
matrícula aceita `email`, `photoUrl` e `entryYear` — todos opcionais, para
não travar a importação da lista de alunos.

Matricular com um RA já cadastrado reaproveita o aluno existente: o nome do
primeiro cadastro é mantido, e os campos opcionais só são preenchidos se
ainda estiverem vazios — nunca sobrescritos.

Trancamento é `status: DROPPED`, não delete.

## Outros comandos

```bash
npm run lint      # eslint --fix
npm run format    # prettier
npm run build     # gera dist/
```
