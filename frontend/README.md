# frontend

Interface do uni-chamada: React 19, TypeScript, Vite. São duas telas em uma: o
painel do professor (cursos, chamada, relatório) e a tela do aluno, que abre
pelo QR Code projetado em sala.

## Rodando

Tudo em container, na raiz do repo:

```bash
docker compose up -d --build
```

Abre em `http://localhost:5173` e recarrega ao salvar.

No host, se preferir:

```bash
cp .env.example .env
npm install
npm run dev
```

A `VITE_API_URL` aponta para a API (`http://localhost:3000` no padrão). Precisa
do backend no ar, senão o login não passa.

Para o aluno escanear o QR do celular, o endereço precisa ser alcançável na
rede: suba com `npm run dev -- --host` e troque a `VITE_API_URL` pelo IP da sua
máquina.

## Testes

```bash
npm test          # vitest
npm run test:watch
```

## Estilos

CSS puro, sem framework. `src/styles/tokens.css` é gerado e não deve ser editado
à mão — mexa em `tokens.json` e rode:

```bash
npm run tokens
```

`bundle.css` tem os componentes (classes com prefixo `uc-`) e `app.css` o resto.
O tema claro/escuro segue o sistema, com override em `data-theme`.

## Outros comandos

```bash
npm run lint      # oxlint
npm run build     # tsc -b + vite build
npm run preview   # serve o build
```
