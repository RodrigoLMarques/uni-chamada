# backend

API do uni-chamada, feita em NestJS 12 (Node 26, TypeScript 6).

## Pré-requisitos

- Docker (é o caminho padrão: Postgres e a API sobem em container)
- Node **>= 24.9** se você for rodar os testes fora do container

> O mínimo de 24.9 não é capricho: o NestJS 12 publica seus pacotes como
> ESM (`"type": "module"`), e só a partir dessa versão o Jest consegue
> carregá-los via `require(esm)`. Em Node 22 os testes falham com
> `Must use import to load ES Module`. O projeto está no 26.x, a última.

## Opção 1: tudo em container

Na raiz do repositório:

```bash
docker compose up -d --build
```

Sobe `postgres` e `backend` (que só inicia depois do healthcheck do banco
passar). A API fica em `http://localhost:3000`.

```bash
docker compose logs -f backend   # acompanha os logs
docker compose down              # derruba tudo
docker compose down -v           # derruba e apaga os dados do banco
```

O container usa o `Dockerfile.dev` e roda `npm run start:dev`, então o
`backend/` fica montado como volume e o Nest recompila sozinho a cada
arquivo salvo — na prática ~2s, sem rebuild de imagem.

Ele roda como o usuário `node` (uid 1000), e não como root, para que
`dist/` e `*.tsbuildinfo` gerados dentro do container não fiquem
root-owned no host.

O `node_modules` vive dentro do container (volume anônimo), e não no host.
Por isso, **ao adicionar ou atualizar uma dependência** é preciso
rebuildar:

```bash
docker compose up -d --build backend
```

## Opção 2: banco em container, API no host

```bash
docker compose up -d postgres
npm install
npm run start:dev
```

## Testes

```bash
npm test          # unitários
npm run test:e2e  # sobe o app em memória e bate nos endpoints
npm run test:cov  # cobertura
```

Os scripts chamam o Jest via
`node --experimental-vm-modules ./node_modules/jest/bin/jest.js`, igual ao
template oficial do Nest 12. A flag é obrigatória: sem ela, o Jest não
carrega os pacotes ESM do Nest, mesmo no Node 26. Ela imprime um
`ExperimentalWarning` em cada execução — é esperado.

Nenhum dos dois precisa de banco no ar hoje: o hello world não toca no
Postgres.

## Lint e formatação

```bash
npm run lint      # eslint --fix
npm run format    # prettier --write
```

ESLint com `recommendedTypeChecked` + Prettier (aspas simples, vírgula
final, largura 100).

> O template oficial do Nest 12 já migrou para **oxlint** (que o
> `frontend/` daqui também usa) e **vitest**. Mantivemos eslint + jest por
> alinhamento com os outros projetos; trocar é uma decisão em aberto.

## Build

```bash
npm run build     # gera dist/
docker compose build backend
```

O `Dockerfile` (sem `.dev`) é a imagem de produção, usada pelo CI: build
multi-stage que compila o TypeScript, instala só as dependências de
produção e roda `node dist/main` com o usuário `node`, não-root. É esse
arquivo que o workflow de deploy publica como `uni-chamada-api`.

## Problemas comuns

**O watcher entra em loop com `Cannot find module '/home/node/app/dist/main'`**

Acontece se o `dist/` for apagado à mão com o watcher rodando: o
`tsconfig.build.tsbuildinfo` continua dizendo que a saída está em dia,
então o `tsc` responde `Found 0 errors` sem emitir nada e o runner não
encontra o `dist/main`. Apague o `.tsbuildinfo` junto e reinicie:

```bash
rm -rf backend/dist backend/*.tsbuildinfo
docker compose restart backend
```

## Por que TypeScript 6, e não 7

O TS 7 (compilador nativo) já está publicado, mas o Nest ainda não o
suporta: o `@nestjs/cli@12` traz `typescript: ~6.0.2` como dependência
direta, então o `nest build` compila com a cópia dele (6.0.3)
independentemente do que o projeto declarar. Além disso o `ts-jest` exige
`typescript <7` e o `typescript-eslint` exige `<6.1.0`.

Por isso o `typescript` está fixado em `~6.0.3`: é a versão mais recente
que o Nest e o resto do toolchain aceitam. O `~` (e não `^`) é de
propósito — um 6.1 quebraria o peer do `typescript-eslint`.

O tsconfig já usa `module`/`moduleResolution: nodenext` com
`resolvePackageJsonExports`, como o template oficial, então não há nenhuma
opção deprecada pendente para a migração ao TS 7.

## Estrutura

```
src/
  main.ts            # bootstrap: ValidationPipe global, CORS, porta
  app.module.ts      # módulo raiz (ConfigModule global)
  app.controller.ts  # GET / -> Hello World
  app.service.ts
test/
  app.e2e-spec.ts
```

Módulos novos entram em `src/modules/<nome>/` e são importados no
`app.module.ts`.

## Variáveis de ambiente

| Variável | Default | Para quê |
|---|---|---|
| `PORT` | `3000` | porta HTTP |
| `DATABASE_URL` | — | conexão com o Postgres; já definida no Compose e ainda não usada pela aplicação |

O `ConfigModule` é global e lê um `backend/.env` se existir (gitignorado).
