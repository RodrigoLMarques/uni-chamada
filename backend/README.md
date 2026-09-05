# backend

API do uni-chamada, feita em Spring Boot 4 (Java 25, Maven).

## Pré-requisitos

- Docker (Postgres e, opcionalmente, a própria API rodam em container)
- JDK 25 — só se você for rodar a API ou os testes fora do container

Não é preciso instalar Maven: o build em container usa a imagem oficial do
Maven e, no host, o projeto tem o Maven Wrapper (`./mvnw`).

## Opção 1: tudo em container

Na raiz do repositório:

```bash
docker compose up -d --build
```

Sobe o `postgres` e o `backend` (que só inicia depois do healthcheck do
banco passar). A API fica em `http://localhost:8080`.

```bash
docker compose logs -f backend   # acompanha os logs
docker compose down              # derruba tudo
docker compose down -v           # derruba e apaga os dados do banco
```

## Modo de desenvolvimento (rebuild automático)

```bash
docker compose watch
```

O Compose fica em foreground observando `backend/src` e `backend/pom.xml`.
A cada alteração salva ele rebuilda a imagem e recria o container
automaticamente — na prática ~6s por ciclo, porque as dependências Maven
ficam em cache mount e as camadas do Docker são reaproveitadas.

`Ctrl+C` encerra o watch. Para ver os logs da aplicação junto, use outro
terminal com `docker compose logs -f backend`.

## Opção 2: banco em container, API no host

Útil para desenvolver com hot reload do devtools.

```bash
docker compose up -d postgres
```

O `application.yaml` aponta para o host `postgres`, que só resolve dentro
da rede do Compose. Rodando no host, sobrescreva a URL:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/unichamada ./mvnw spring-boot:run
```

## Rodando os testes

Os testes sobem o contexto Spring, então precisam do Postgres no ar:

```bash
docker compose up -d postgres
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/unichamada ./mvnw test
```

> Sem banco acessível, `contextLoads` e qualquer teste que suba o contexto
> falham com `Failed to determine a suitable driver class`, pois o
> Flyway/Data JPA criam o datasource já na inicialização.

## Build

```bash
./mvnw clean package     # gera o .jar em target/
docker compose build backend
```

A imagem é multi-stage: compila com `maven:3.9-eclipse-temurin-25` e roda o
`.jar` em `eclipse-temurin:25-jre` com usuário não-root. Os testes ficam
fora do build da imagem porque exigiriam um banco durante o `docker build`.

## Problemas comuns

**`Failed to init ct.sym for .../java-21-openjdk/lib/jrt-fs.jar`** (VS Code)

A extensão Java está usando um JDK antigo, que não tem o `ct.sym` exigido
para compilar com `--release 25`. Aponte a extensão para o JDK 25 no seu
`.vscode/settings.json` (o diretório é gitignorado, pois o caminho varia
por máquina):

```json
{
  "java.jdt.ls.java.home": "/usr/lib/jvm/java-25-openjdk",
  "java.configuration.runtimes": [
    { "name": "JavaSE-25", "path": "/usr/lib/jvm/java-25-openjdk", "default": true }
  ]
}
```

Depois: `Developer: Reload Window` e, se persistir,
`Java: Clean Java Language Server Workspace`.

## Segurança

O projeto usa `spring-boot-starter-security`, que por padrão exige Basic
Auth em todos os endpoints (com uma senha aleatória impressa no log a cada
start). `SecurityConfig` libera `/` publicamente; qualquer endpoint novo
nasce autenticado até ser explicitamente liberado nessa mesma classe.
