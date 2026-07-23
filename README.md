# Maple Leaf — Backend

API do e-commerce **Maple Leaf** (bolsas, carteiras e mochilas), construída com **NestJS**, **Prisma** (PostgreSQL) e **Redis**. Integra os gateways **Mercado Pago** (pagamentos via cartão e Pix) e **Melhor Envio** (cotação e emissão de frete).

## Stack

- **[NestJS 11](https://nestjs.com/)** (Express) — framework HTTP
- **[Prisma 7](https://www.prisma.io/)** — ORM sobre **PostgreSQL**
- **Redis** (via `@keyv/redis` + `@nestjs/cache-manager`) — cache de leitura (produtos, sessão do usuário)
- **Passport JWT** — autenticação via cookies HTTPOnly (`access_token` + `refresh_token`)
- **Argon2** — hash de senhas
- **Mercado Pago SDK** — pagamentos (cartão e Pix) e webhooks
- **Melhor Envio** (HTTP via `@nestjs/axios`) — cálculo de frete e geração de etiquetas
- **class-validator** / **class-transformer** — validação e transformação de DTOs
- **Jest** — testes unitários e e2e

## Pré-requisitos

- Node.js 20+
- Docker (para subir o PostgreSQL local via `docker-compose.yml`) ou uma instância PostgreSQL própria
- Um Redis acessível (local ou remoto)

## Configuração do ambiente

1. Copie o arquivo de exemplo e preencha os valores:

   ```bash
   cp .env.example .env
   ```

2. Principais variáveis (veja `.env.example` para a lista completa):

   | Variável | Descrição |
   |---|---|
   | `PORT` | Porta HTTP do servidor (padrão `3000`) |
   | `DATABASE_URL` | String de conexão do PostgreSQL |
   | `FRONTEND_URL` | Origem liberada no CORS e usada nos `back_urls` do Mercado Pago |
   | `BACKEND_URL` | Base usada para montar a `notification_url` dos webhooks |
   | `REDIS_URL` / `CACHE_TTL_MS` | Conexão Redis e TTL padrão do cache |
   | `PASSWORD_PEPPER` | Pimenta aplicada às senhas antes do hash Argon2 |
   | `JWT_SECRET` | Chave de assinatura do `access_token` |
   | `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_SECRET` | Credenciais do Mercado Pago |
   | `MELHOR_ENVIO_TOKEN` / `MELHOR_ENVIO_API_URL` / `MELHOR_ENVIO_FROM_ZIPCODE` | Credenciais e configuração do Melhor Envio |

3. Suba um PostgreSQL local com Docker Compose (porta `5433` no host):

   ```bash
   docker compose up -d
   ```

## Instalação

```bash
npm install
```

## Banco de dados (Prisma)

```bash
# Gera o client do Prisma a partir do schema
npm run prisma:generate

# Cria e aplica migrations em desenvolvimento
npm run prisma:migrate

# Aplica migrations existentes (produção/CI)
npm run prisma:migrate:deploy

# Popula o banco com dados de exemplo (usuários, produtos, etc.)
npm run prisma:seed

# Abre o Prisma Studio (GUI do banco) em http://localhost:5555
npm run prisma:studio
```

> Guia detalhado de setup e troubleshooting do banco: [`PRISMA_SETUP.md`](PRISMA_SETUP.md).

## Executando a aplicação

```bash
# desenvolvimento
npm run start

# desenvolvimento com watch mode (recarrega ao salvar)
npm run start:dev

# debug com watch mode
npm run start:debug

# build de produção
npm run build

# executa o build de produção
npm run start:prod
```

A API sobe com prefixo global `/api` (ex.: `http://localhost:3000/api/auth/login`). CORS é restrito à origem definida em `FRONTEND_URL`, com suporte a cookies (`credentials: true`).

## Testes

```bash
# testes unitários
npm run test

# testes unitários em modo watch
npm run test:watch

# cobertura de testes
npm run test:cov

# testes e2e
npm run test:e2e
```

## Lint e formatação

```bash
npm run lint
npm run format
```

## Estrutura do projeto

```
src/
├── main.ts                    # Bootstrap: prefixo /api, CORS, ValidationPipe, cookie-parser
├── app.module.ts               # Módulo raiz — importa todos os módulos de domínio
├── config/                     # Configuração global (ex.: RedisCacheModule)
├── common/                     # Guards, decorators e utilitários compartilhados
├── modules/
│   ├── auth/                   # Login, registro, refresh token, verificação de e-mail
│   ├── users/                  # CRUD de usuários (ADMIN)
│   ├── addresses/               # Endereços do usuário autenticado
│   ├── products/                # Catálogo de produtos + upload de imagens
│   ├── carts/                   # Carrinho de compras e cotação de frete
│   ├── orders/                  # Checkout e gestão de pedidos
│   ├── payments/                 # Criação de pagamentos (cartão/Pix)
│   └── prisma/                   # PrismaService (conexão com o banco)
└── integrations/
    ├── payment/                  # Integração com Mercado Pago + endpoint de webhook
    └── shipping/                  # Integração com Melhor Envio (frete)

prisma/
├── schema.prisma                # Modelo de dados
├── migrations/                   # Histórico de migrations
└── seed.ts                       # Script de seed
```

## Documentação da API

A referência completa de endpoints (autenticação, produtos, carrinho, pedidos, pagamentos, webhooks, modelo de dados e variáveis de ambiente) está em [`api_doc.md`](api_doc.md).

Há também uma documentação complementar voltada à integração com o front-end em [`DOCUMENTACAO.md`](DOCUMENTACAO.md), com exemplos de payloads e fluxos recomendados (autenticação, checkout, pagamento).

## Autenticação

A API autentica via **cookies HTTPOnly**, não via header `Authorization`:

- `access_token` — JWT de curta duração (15 min)
- `refresh_token` — token opaco de longa duração (7 dias), usado apenas em `POST /auth/refresh`

O client HTTP do front-end deve enviar credenciais em todas as requisições (`credentials: 'include'` no `fetch`, ou `withCredentials: true` no Axios).

## Uploads de produtos

Imagens de produtos são enviadas via `multipart/form-data` e persistidas em `uploads/products/`, sendo referenciadas por URL relativa (`/uploads/products/<arquivo>`). Em produção, garanta que esse diretório seja servido estaticamente (reverse proxy, CDN ou configuração adicional do Nest) e, idealmente, persistido fora do container da aplicação.
