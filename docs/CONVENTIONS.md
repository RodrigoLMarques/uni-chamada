# Convenções de branch e commit

| Onde | Formato | Exemplo |
|---|---|---|
| Branch | `<tipo>/<issue>-<slug>` | `feat/42-cadastro-de-usuario` |
| Commit | `<tipo>(<escopo>): <descrição>` | `feat(backend): adiciona entidade User` |
| Título do PR | `<tipo>(<escopo>): <descrição>` | `feat(backend): cadastro de usuário` |

Usamos **squash merge**: o título do PR vira o commit na `main`, e o GitHub anexa o número do PR sozinho. É o mais importante dos três.

---

## Tipos

Baseado em [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/). São os únicos aceitos.

| Tipo | Quando usar |
|---|---|
| `feat` | nova funcionalidade para o usuário |
| `fix` | correção de bug |
| `docs` | apenas documentação (README, ADR, JSDoc, OpenAPI) |
| `style` | formatação, nada que mude comportamento |
| `refactor` | reescrita que não corrige bug nem adiciona funcionalidade |
| `perf` | melhora performance |
| `test` | adiciona ou corrige testes |
| `build` | build ou dependências (`package.json`, Dockerfile) |
| `ci` | pipeline e automação (`.github/workflows/`) |
| `chore` | manutenção que não se encaixa acima (`.gitignore`, templates) |
| `revert` | reverte um commit anterior |

**Escopos:** só `backend` e `frontend`. Opcional: omita quando a mudança for transversal.

---

## Branches

```
feat/42-cadastro-de-usuario
fix/58-validacao-de-cpf
docs/67-readme-setup
```

- **Sempre o número da issue.** É o que liga branch, PR e issue.
- Minúsculas, hífen entre palavras, slug de 3 a 5 palavras.
- **Sem acentos e sem cedilha** (`validacao`, não `validação`): macOS e Linux normalizam UTF-8 de formas diferentes e isso cria branch fantasma.
- Uma branch por issue. Nunca por pessoa (`rodrigo/coisas`) nem por camada (`backend/geral`).
- **Máximo de 3 dias de vida.** Passou disso, a issue está grande demais. Quebre em issues menores.

---

## Commits

```
feat(backend): add User entity
test(backend): cover duplicate email validation
fix(frontend): corrige redirecionamento após logout
docs: documenta setup do ambiente local
```

A única parte obrigatória é o formato `<tipo>(<escopo>): <descrição>`, que o commitlint valida. O resto é recomendação:

- **Inglês de preferência, português é aceito.** Escreva na língua que sair mais natural, sem travar por causa disso. O que não vale é misturar as duas na mesma frase.
- Imperativo no presente: "add", não "added".
- Minúscula inicial, sem ponto final, primeira linha curta.
- Descreva **o que** mudou. Evite mensagens vazias como "WIP", "ajustes" ou "fix bugs", que não dizem nada em code review nem no histórico.
- Commit pequeno e frequente ajuda mais na review do que uma mensagem perfeita.

**Breaking change:** `!` antes dos dois pontos, como em `feat(backend)!: remove endpoint /api/v1/login`

**Corpo:** totalmente opcional. Use quando o *porquê* não for óbvio pelo diff, e escreva do jeito que preferir.

```
fix(backend): usa transação explícita no cadastro

O rollback não acontecia quando a validação de CPF falhava depois
do insert, deixando registro órfão na tabela de endereços.

Refs #58
```

**O commit não repete o tipo da branch.** O tipo da branch reflete a issue; o do commit, aquela mudança. Uma branch `feat/` normalmente contém commits `feat`, `test`, `refactor` e `docs`.

---

## Pull requests

- Título = exatamente as regras do commit. **Não escreva o número da issue**: o GitHub já anexa o número do PR no squash, e issues e PRs dividem a mesma numeração, então um `(#42)` manual vira `(#42) (#43)` na `main`.
- Descrição: o que muda e por quê, como testar, e `Closes #<numero>`, que liga o PR à issue e fecha ela no merge.
- Revisável em 15 minutos. Passou de ~500 linhas, provavelmente são dois PRs.
