# QR Code Manager

Sistema de **QR codes dinâmicos para plaquinhas** (balcão, mesa, vitrine). Cada plaquinha recebe um link fixo
`{BASE_URL}/r/{slug}`, gravado no QR code (e, se quiser, num chip NFC). Quem escaneia é redirecionado (**302**)
para o destino configurado no painel, e esse destino pode ser trocado a qualquer momento sem reimprimir nada.

## O que faz

- **Plaquinhas**: cria links com slug aleatório ou personalizado (ex.: `pizzaria-do-ze`), troca o destino e
  guarda o histórico de destinos. Trocar o slug de uma plaquinha já impressa mantém o antigo como apelido que
  continua funcionando (slugs nunca são reaproveitados).
- **Lotes**: gera várias plaquinhas de uma vez, "não vinculadas", e baixa todos os QR codes num ZIP. Depois cada
  uma é vinculada a um cliente e a um destino.
- **Clientes**: cadastro simples com as plaquinhas de cada um.
- **Estatísticas**: acessos por dia, celular × computador, com filtro de robôs.
- **Painel administrativo** com login por usuário (sem cadastro público) e aviso quando a URL base ainda é
  provisória, para não imprimir QR com endereço errado.

## Stack

- **Next.js 16** (App Router, Server Actions, TypeScript) + **React 19**
- **Tailwind CSS 4** + componentes **shadcn/ui** e ícones `lucide-react`
- **PostgreSQL 17** em Docker, acessado só pelo servidor com `postgres.js`; migrações em SQL puro
- Autenticação própria: senha com **scrypt** (`node:crypto`) e sessão em **JWT HS256** (`jose`) num cookie `httpOnly`
- Validação com **Zod**, QR codes com `qrcode` e ZIP com `jszip`
- Testes com **Vitest** (unitários e de integração com o banco)

## Como rodar

Requisitos: Node 20.9+ e Docker Desktop rodando.

### Windows (um comando)

```powershell
.\start.ps1            # sobe o Postgres e o Next.js e abre o navegador
.\stop.ps1             # para tudo (os dados do banco ficam no volume)
```

O `start.ps1` confere as ferramentas, instala as dependências, cria o `.env.local` (gerando `POSTGRES_PASSWORD`
e `SESSION_SECRET` aleatórios se não existirem), sobe o container, aplica as migrações, cria os usuários de teste
e escolhe uma porta livre para o front. A senha do Postgres vem da variável de ambiente `POSTGRES_PASSWORD`
(ou do `.env.local`).

### Passo a passo (qualquer sistema)

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha:
   - `POSTGRES_PASSWORD`: uma senha qualquer para o banco local;
   - `DATABASE_URL=postgres://postgres:<POSTGRES_PASSWORD>@127.0.0.1:54422/qrcode`;
   - `SESSION_SECRET`: 32+ caracteres, ex.: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`;
   - `NEXT_PUBLIC_BASE_URL=http://localhost:3000`.
3. Exporte `POSTGRES_PASSWORD` no terminal e rode `npm run db:up`
4. `npm run db:migrate`
5. `npm run db:seed` (clientes fictícios e usuários `admin` e `operador`; a senha vem de `SEED_PASSWORD` ou é
   gerada e mostrada no terminal). O seed recusa rodar contra banco que não seja local.
6. `npm run dev` e abra http://localhost:3000

## Testes

| Comando | O que roda |
|---|---|
| `npm test` | Unitários (slug, URL, detecção de robô, decisão de redirect, hash de senha, sessão, usuário) |
| `npm run test:db` | Integração com o Postgres local (regras do banco; cada teste faz rollback) |
| `npm run lint` / `npm run build` | ESLint e build de produção |

## Decisões técnicas

- **Redirect 302 com `Cache-Control: no-store`**: um 301 ficaria preso no cache dos leitores de QR e impediria
  trocar o destino.
- **Slugs globais e permanentes**: o banco garante que um slug (principal ou apelido) nunca volta a ser usado,
  para uma plaquinha impressa nunca apontar para o cliente errado.
- **Segurança**: toda server action do painel exige usuário logado antes de qualquer SQL; o proxy faz uma checagem
  rápida da assinatura e a camada de dados confere o usuário no banco (o que permite revogar sessões). Limite de
  10 tentativas de login erradas a cada 15 minutos. Tabelas com RLS ligado e sem permissões para papéis públicos,
  pensando num Postgres gerenciado em produção.
- **Migrações com checksum**: `scripts/migrate.mjs` recusa uma migração alterada depois de aplicada.
- **Scripts que protegem o ambiente**: seed e reset só rodam contra banco local; usuários de produção são criados
  com `scripts/user-admin.mjs`, sem senha fixa no código.

## O que eu fiz

Projeto pessoal. Planejei e construí: modelagem do banco e das migrações, regras de slug e redirecionamento,
autenticação própria com sessão revogável, painel completo (plaquinhas, lotes, clientes, estatísticas), geração de
QR codes e ZIP, testes unitários e de integração, e os scripts `start.ps1`/`stop.ps1` que sobem o ambiente
inteiro com um comando no Windows. Comecei com Supabase e depois migrei para um Postgres simples em Docker com
autenticação própria, para ter menos peças e controle total das regras.
