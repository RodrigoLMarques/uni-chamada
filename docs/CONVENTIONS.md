# Convenções de branch e commit

Este documento define como nomear branches, escrever mensagens de commit e titular pull requests neste repositório. A regra vale para todos os membros da equipe, sem exceção.

O objetivo é que o histórico da `main` possa ser lido de cima a baixo como a lista de entregas do projeto.

---

## Resumo

| Onde | Formato | Exemplo |
|---|---|---|
| Branch | `<tipo>/<numero-da-issue>-<slug>` | `feat/42-cadastro-de-usuario` |
| Commit | `<tipo>(<escopo>): <descrição>` | `feat(backend): adiciona entidade User` |
| Título do PR | `<tipo>(<escopo>): <descrição> (#<issue>)` | `feat(backend): cadastro de usuário (#42)` |

O **título do PR** é o mais importante: usamos squash merge, então é ele que
vira o commit na `main` e alimenta o changelog.

---

## Tipos

Baseado em [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).
Estes são os únicos tipos aceitos.

| Tipo | Quando usar |
|---|---|
| `feat` | nova funcionalidade para o usuário |
| `fix` | correção de bug |
| `docs` | apenas documentação (README, ADR, javadoc, OpenAPI) |
| `style` | formatação de código, indentação, import — nada que mude comportamento |
| `refactor` | reescrita que não corrige bug nem adiciona funcionalidade |
| `perf` | mudança que melhora performance |
| `test` | adiciona ou corrige testes |
| `build` | build ou dependências (`build.gradle.kts`, `package.json`, Dockerfile) |
| `ci` | pipeline e automação (`.github/workflows/`) |
| `chore` | manutenção que não se encaixa acima (`.gitignore`, templates, `CODEOWNERS`) |
| `revert` | reverte um commit anterior |

### Cuidado com `style`

`style` significa **formatação de código**, não CSS. Mudança visual no
frontend é `feat` (comportamento novo) ou `fix` (conserto de algo quebrado).

### `build` vs `ci` vs `chore`

- `build` — mudou como o projeto compila ou empacota
- `ci` — mudou algo dentro de `.github/workflows/`
- `chore` — o resto

Em caso de dúvida entre `build` e `chore`, escolha um e siga. Consistência
importa mais que a classificação perfeita.

---

## Escopos

Apenas dois escopos são aceitos:

- `backend` — mudanças em `backend/`
- `frontend` — mudanças em `frontend/`

O escopo é **opcional**. Omita quando a mudança for transversal ou tocar os dois
lados:

```
ci: adiciona workflow de testes
chore: adiciona templates de issue
feat(backend): endpoint POST /users
fix(frontend): corrige validação do formulário de login
```

---

## Branches

### Formato

```
<tipo>/<numero-da-issue>-<slug-curto>
```

### Exemplos

```
feat/42-cadastro-de-usuario
fix/58-validacao-de-cpf
chore/61-configurar-jacoco
docs/67-readme-setup
```

### Regras

- **Sempre inclua o número da issue.** É o que liga branch, PR e issue.
- Tudo em minúsculas, palavras separadas por hífen.
- **Sem acentos e sem cedilha.** Git aceita UTF-8, mas macOS e Linux
  normalizam de formas diferentes e isso gera branch fantasma.
  Use `validacao`, não `validação`.
- Sem espaços e sem os caracteres `: ~ ^ ? * [ ] \`
- Slug curto — 3 a 5 palavras. O detalhe está na issue.
- Uma branch por issue. Nunca branch por pessoa (`rodrigo/coisas`) nem por
  camada (`backend/geral`).

### Vida útil

**Máximo de 3 dias.** Trabalhamos em trunk-based development: a `main` é a
única branch permanente e tudo mais é descartável.

Se a sua branch está passando de três dias, a issue está grande demais.
Quebre em issues menores e abra PRs separados.

---

## Commits

### Formato

```
<tipo>(<escopo>): <descrição>
```

### Regras da descrição

- Imperativo no presente: "adiciona", não "adicionado" nem "adicionando"
- Minúscula inicial, sem ponto final
- Máximo de 72 caracteres na primeira linha
- Descreva **o que** mudou, não como

### Exemplos

```
feat(backend): adiciona entidade User
test(backend): cobre validação de email duplicado
refactor(backend): extrai UserValidator
fix(frontend): corrige redirecionamento após logout
docs: documenta setup do ambiente local
```

### Corpo e rodapé (opcionais)

Use o corpo quando o **porquê** não for óbvio pelo diff:

```
fix(backend): usa transação explícita no cadastro

O rollback não acontecia quando a validação de CPF falhava depois
do insert, deixando registro órfão na tabela de endereços.

Refs #58
```

### Breaking change

Adicione `!` antes dos dois pontos:

```
feat(backend)!: remove endpoint legado /api/v1/login
```

### Commits e o tipo da branch

Os commits **não precisam** repetir o tipo da branch. É normal e correto que
uma branch `feat/` contenha commits `test`, `refactor` e `docs`:

```
branch: feat/42-cadastro-de-usuario
  ├─ feat(backend): adiciona entidade User
  ├─ test(backend): cobre validação de email duplicado
  ├─ refactor(backend): extrai UserValidator
  └─ docs(backend): documenta endpoint no OpenAPI
```

O tipo da **branch** reflete o objetivo da issue.
O tipo do **commit** reflete aquela mudança específica.

### Frequência

Commit pequeno e frequente. Um commit deve deixar o projeto em um estado
coerente — compila e os testes passam.

Evite "WIP", "ajustes" e "correções". Se precisar salvar trabalho no meio,
use `git stash` ou faça o commit e depois reorganize com
`git rebase -i` antes de abrir o PR.

---

## Pull requests

### Título

```
<tipo>(<escopo>): <descrição> (#<numero-da-issue>)
```

O título segue exatamente as mesmas regras da mensagem de commit, com o número
da issue no final. Como usamos **squash merge**, este título vira o commit na
`main`.

### Descrição

Use o template do repositório. No mínimo:

- O que muda e por quê
- `Closes #<numero>` para fechar a issue automaticamente
- Como testar

### Tamanho

Um PR deve ser revisável em 15 minutos. Se passou de ~400 linhas alteradas,
provavelmente deveria ser dois PRs.

---

## Fluxo completo

```bash
# 1. parte da main atualizada
git switch main
git pull --ff-only

# 2. cria a branch a partir da issue
git switch -c feat/42-cadastro-de-usuario

# 3. trabalha com commits pequenos
git commit -m "feat(backend): adiciona entidade User"
git commit -m "test(backend): cobre validação de email duplicado"

# 4. atualiza contra a main antes de abrir o PR
git fetch origin
git rebase origin/main

# 5. sobe e abre o PR
git push -u origin feat/42-cadastro-de-usuario
gh pr create --fill

# 6. depois do merge, limpa
git switch main
git pull --ff-only
git branch -d feat/42-cadastro-de-usuario
```

### Rebase, não merge

Para atualizar a sua branch com a `main`, use `git rebase origin/main`.
Não use `git merge main` — isso polui o histórico com merge commits sem
significado.

Nunca faça rebase de uma branch que outra pessoa já puxou.

---

## Validação automática

O repositório valida:

- **Mensagem de commit** — commitlint via hook `commit-msg`
- **Título do PR** — workflow no GitHub Actions

Se o commit for rejeitado, corrija a mensagem com:

```bash
git commit --amend
```

Se já tiver feito push, corrija e force com `--force-with-lease` (nunca
`--force`).

---

## Antipadrões

| Errado | Certo | Por quê |
|---|---|---|
| `chore: setup inicial` (180 arquivos) | vários commits `build`, `ci`, `chore`, `docs` | impossível de revisar ou reverter |
| `feat/cadastro` | `feat/42-cadastro-de-usuario` | sem rastreabilidade com a issue |
| `fix: bugs` | `fix(backend): corrige NPE ao salvar usuário sem endereço` | não diz nada |
| `feat(frontend): style` para mudança de CSS | `feat(frontend): ajusta espaçamento do formulário` | `style` é formatação de código |
| branch viva por 2 semanas | issue quebrada em PRs de até 3 dias | vira merge hell |
| `git commit -m "WIP"` | commit coerente ou `git stash` | ruído no histórico |