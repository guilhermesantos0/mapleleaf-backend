# Documentação da API — Maple Leaf Backend

> Framework: **NestJS** (Express) · ORM: **Prisma** (PostgreSQL) · Cache: **Redis** (Keyv)
> Prefixo global de rotas: **`/api`** (definido em `app.setGlobalPrefix('api')`, [main.ts](src/main.ts))
> Todas as rotas abaixo devem ser precedidas por esse prefixo. Ex.: o endpoint `POST /auth/login` deve ser chamado em `POST /api/auth/login`.

---

## Visão geral

A API expõe um e-commerce de bolsas, carteiras e mochilas (Maple Leaf), com os seguintes domínios:

- **Autenticação** (`/auth`) — login, registro, refresh de token, verificação de e-mail.
- **Usuários** (`/users`) — CRUD de usuários administrativos/funcionários.
- **Endereços** (`/addresses`) — CRUD de endereços do usuário autenticado.
- **Produtos** (`/products`) — catálogo público + CRUD administrativo, com upload de imagens.
- **Carrinho** (`/carts`) — carrinho ativo por usuário, itens, cotação de frete.
- **Pedidos** (`/orders`) — checkout, listagem administrativa e do usuário, cancelamento.
- **Pagamentos** (`/payments`) — criação de pagamentos via cartão e Pix (Mercado Pago).
- **Webhooks** (`/webhooks`) — recebimento de notificações assíncronas do Mercado Pago.

### Configuração global relevante ([main.ts](src/main.ts))

| Configuração | Valor | Efeito |
|---|---|---|
| `setGlobalPrefix` | `api` | Todas as rotas ficam sob `/api/*` |
| `enableCors` | `origin: FRONTEND_URL`, `credentials: true` | CORS restrito ao front configurado, com cookies habilitados |
| `ValidationPipe` | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` | Propriedades não declaradas no DTO são **removidas silenciosamente** se não houver decorators, ou causam **erro 400** se houver campos extras não mapeados; os payloads são transformados para as classes dos DTOs |
| `cookie-parser` | — | Necessário pois os tokens JWT trafegam via **cookies HTTPOnly**, não via header `Authorization` |

### Autenticação e cookies

Diferente de uma API tradicional com Bearer Token, esta API autentica via **cookies HTTPOnly**:

- `access_token` — JWT de curta duração (**15 minutos**), assinado com `JWT_SECRET`. Usado pela `JwtStrategy` ([jwt.strategy.ts](src/modules/auth/strategies/jwt.strategy.ts)), que lê o cookie (não o header `Authorization`).
- `refresh_token` — token opaco de longa duração (**7 dias**), no formato `"<userId>.<tokenAleatorio>"`, armazenado com hash (argon2) na tabela `RefreshToken`. Usado apenas em `POST /auth/refresh`.

Ambos os cookies são `httpOnly`, com `secure` e `sameSite: 'none'` em produção (`NODE_ENV=production`), ou `secure: false` e `sameSite: 'lax'` em desenvolvimento.

> ⚠️ Isso torna o cabeçalho `Authorization: Bearer <token>` mencionado em versões anteriores desta documentação **incorreto** para este backend — a autenticação é feita exclusivamente por cookies enviados automaticamente pelo navegador (`credentials: 'include'` no client HTTP).

### Guards de autorização

| Guard | Comportamento |
|---|---|
| `JwtAuthGuard` | Exige cookie `access_token` válido; retorna `401` caso contrário. Popula `request.user` com o registro completo do usuário (Prisma). |
| `OptionalJwtGuard` | Mesmo fluxo, mas nunca lança erro — se não houver usuário autenticado, `request.user` é `null`. Usado em rotas públicas que mudam de comportamento se o usuário estiver logado (ex.: listagem de produtos, que mostra campos extras para admins). |
| `RolesGuard` + `@Roles(...)` | Verifica se `request.user.role` está entre os papéis exigidos pelo decorator `@Roles()`. Deve ser combinado com `JwtAuthGuard` (aplicado **depois** dele na lista de guards) para garantir que `request.user` já exista. |

### Papéis de usuário (`UserRole`)

```
ADMIN | EMPLOYEE | CLIENT
```

Definido em [schema.prisma](prisma/schema.prisma). Novos usuários criados via `/auth/register` sempre recebem `CLIENT`.

### Padrão de erros

Como a API não possui um `ExceptionFilter` customizado, os erros seguem o formato padrão do NestJS:

```json
{
  "statusCode": 401,
  "message": "Credenciais inválidas",
  "error": "Unauthorized"
}
```

Quando o `ValidationPipe` rejeita o payload (`403`/`400`), `message` é um array com uma entrada por campo inválido.

| Status | Quando ocorre |
|---|---|
| `200` | Sucesso |
| `400` | Erro de validação (`ValidationPipe`) ou regra de negócio (`BadRequestException`) |
| `401` | Cookie ausente/inválido/expirado, ou credenciais incorretas |
| `403` | Usuário autenticado, mas sem o papel exigido pelo `@Roles()` |
| `404` | Recurso não encontrado (`NotFoundException`) |
| `409` | Conflito, ex.: e-mail já cadastrado (`ConflictException`) |
| `500` | Erro interno não tratado |

---

## Sumário

- [Autenticação (`/auth`)](#autenticação-auth)
- [Usuários (`/users`)](#usuários-users)
- [Endereços (`/addresses`)](#endereços-addresses)
- [Produtos (`/products`)](#produtos-products)
- [Carrinho (`/carts`)](#carrinho-carts)
- [Pedidos (`/orders`)](#pedidos-orders)
- [Pagamentos (`/payments`)](#pagamentos-payments)
- [Webhooks (`/webhooks`)](#webhooks-webhooks)
- [Modelo de dados](#modelo-de-dados)

---

## Autenticação (`/auth`)

Fonte: [auth.controller.ts](src/modules/auth/auth.controller.ts), [auth.service.ts](src/modules/auth/auth.service.ts), [login.dto.ts](src/modules/auth/dto/login.dto.ts), [create-user.dto.ts](src/modules/auth/dto/create-user.dto.ts)

### POST /auth/login

Autentica o usuário e define os cookies `access_token`/`refresh_token`.

**Autenticação:** Não requerida

**Body (JSON):**

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `email` | `string` | Sim | `@IsEmail` |
| `password` | `string` | Sim | `@IsString`, não vazio |

```json
{ "email": "joao@email.com", "password": "SenhaForte@123" }
```

**Regras de negócio:**
- Lança `401` se e-mail não existir ou senha não bater (hash `argon2`, com `PASSWORD_PEPPER` concatenado antes do hash).
- Lança `401` se `emailVerifiedAt` for `null` (e-mail ainda não verificado).
- Ao logar com sucesso, **qualquer refresh token anterior do usuário é apagado** e um novo é criado (sessão única por usuário no nível do refresh token).

**Resposta de sucesso:** `200 OK` (+ `Set-Cookie: access_token`, `Set-Cookie: refresh_token`)

```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": "b3f1...uuid",
    "email": "joao@email.com",
    "name": "João Silva",
    "role": "CLIENT",
    "emailVerifiedAt": "2024-01-10T08:00:00.000Z"
  }
}
```

---

### POST /auth/register

Cria um novo usuário com papel `CLIENT` e dispara a geração do token de verificação de e-mail.

**Autenticação:** Não requerida

**Body (JSON):**

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `email` | `string` | Sim | `@IsEmail` |
| `password` | `string` | Sim | 8–32 caracteres; deve conter maiúscula, minúscula, número e caractere especial (`@$!%*?&`) |
| `phone` | `string` | Sim | `@IsPhoneNumber('BR')`; máscara é removida automaticamente (`\D` stripado) antes de salvar |
| `name` | `string` | Sim | 3–100 caracteres |
| `role` | `"ADMIN" \| "EMPLOYEE" \| "CLIENT"` | Não | Ignorado nesta rota — o serviço sempre força `CLIENT` |

```json
{
  "email": "maria@email.com",
  "password": "SenhaForte@123",
  "phone": "11988888888",
  "name": "Maria Souza"
}
```

**Resposta de sucesso:** `200 OK`

```json
{
  "message": "Usuário cadastrado com sucesso",
  "user": {
    "id": "c9a2...uuid",
    "email": "maria@email.com",
    "name": "Maria Souza",
    "role": "CLIENT",
    "cpf": "Desconhecido",
    "phone": "Desconhecido",
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-01T10:00:00.000Z"
  }
}
```

> ⚠️ Note que o campo `phone` retornado aqui vem como `"Desconhecido"` — isso é um comportamento atual do serviço (`toSafeUserObject`), que não reflete o telefone realmente enviado no cadastro. Esse é o objeto retornado por `register`, diferente do objeto retornado por `login`/`me` (`toResponseUserObject`, sem `phone`/`cpf`).

Lança `409 Conflict` se já existir usuário com o mesmo e-mail.

---

### POST /auth/refresh

Renova o par de tokens usando o cookie `refresh_token`.

**Autenticação:** Requer cookie `refresh_token` válido (não usa `JwtAuthGuard`)

**Body:** Nenhum

**Regras de negócio:**
- O token tem o formato `"<userId>.<token>"`; o serviço separa o `userId` do restante para localizar o registro no banco.
- Verifica o hash do token (`argon2.verify`) e a expiração (`expiresAt`).
- Em caso de sucesso, o **refresh token antigo é apagado** e um novo é emitido (rotação de token).

**Resposta de sucesso:** `200 OK` (+ novos `Set-Cookie`)

```json
{ "message": "Token atualizado", "user": { "...": "..." } }
```

Lança `401` se o cookie estiver ausente, o token for inválido ou estiver expirado.

---

### POST /auth/logout 🔒

Invalida a sessão do usuário autenticado.

**Autenticação:** Requerida (`JwtAuthGuard`) + cookie `refresh_token` presente

**Body:** Nenhum

**Efeito:** Remove **todos** os refresh tokens do usuário (`deleteMany`) e limpa os cookies `access_token`/`refresh_token` na resposta.

**Resposta de sucesso:** `200 OK`

```json
{ "message": "Logout realizado com sucesso" }
```

---

### POST /auth/verify-email 🔒

Confirma a verificação de e-mail do usuário autenticado, marcando `emailVerifiedAt`.

**Autenticação:** Requerida (`JwtAuthGuard`)

**Body:** Nenhum

**Regras de negócio:** Lança `409` se o e-mail já estiver verificado. Se houver um token de verificação ainda válido (`emailVerificationTokenExpiresAt` no futuro), ele é validado antes de confirmar.

> Nota de implementação: a rota atual não recebe o token de verificação por parâmetro — ela apenas confere se existe um token válido para o usuário logado e marca `emailVerifiedAt = now()`. Não há endpoint público (sem sessão) para clique em link de e-mail no estado atual do código.

**Resposta de sucesso:** `200 OK` — sem corpo definido explicitamente (retorno `void` do serviço).

---

### POST /auth/resend-email-verification 🔒

Reenvia (ou informa que já reenviou) o token de verificação de e-mail.

**Autenticação:** Requerida (`JwtAuthGuard`)

**Body:** Nenhum

**Resposta de sucesso:** `200 OK`

```json
{ "message": "Token de verificação de e-mail reenviado" }
```
ou, se o token anterior ainda for válido:
```json
{ "message": "Token de verificação de e-mail já foi enviado" }
```

> ⚠️ O envio efetivo de e-mail ainda não está implementado (`// funcao de mandar email` no código) — o endpoint apenas gera/atualiza o token no banco.

---

### GET /auth/me 🔒

Retorna os dados do usuário autenticado (com cache Redis de leitura, TTL = `CACHE_TTL_MS`, padrão 60s).

**Autenticação:** Requerida (`JwtAuthGuard`)

**Resposta de sucesso:** `200 OK`

```json
{
  "message": "Usuário obtido com sucesso",
  "user": {
    "id": "b3f1...uuid",
    "email": "joao@email.com",
    "name": "João Silva",
    "role": "CLIENT",
    "emailVerifiedAt": "2024-01-10T08:00:00.000Z"
  }
}
```

---

## Usuários (`/users`)

Fonte: [users.controller.ts](src/modules/users/users.controller.ts), [users.service.ts](src/modules/users/users.service.ts)

> Todas as rotas deste módulo exigem `JwtAuthGuard` + `RolesGuard` com `@Roles(UserRole.ADMIN)` — **acesso restrito a administradores**.

### GET /users/employees 🔒 `ADMIN`

Lista todos os usuários com papel diferente de `CLIENT` (ou seja, `ADMIN` e `EMPLOYEE`), ordenados por `createdAt` decrescente.

**Resposta de sucesso:** `200 OK`

```json
[
  {
    "id": "1f2e...uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "EMPLOYEE",
    "phone": "11999999999"
  }
]
```

---

### GET /users/:id 🔒 `ADMIN`

Retorna um usuário específico (qualquer papel).

**Path Parameters:** `id` (`string`, UUID)

**Resposta de sucesso:** `200 OK`

```json
{
  "id": "1f2e...uuid",
  "name": "João Silva",
  "email": "joao@email.com",
  "role": "EMPLOYEE",
  "phone": "11999999999"
}
```

Lança `404` se o usuário não existir.

---

### PUT /users/:id 🔒 `ADMIN`

Atualiza parcialmente os dados de um usuário. Aceita qualquer subconjunto dos campos de `CreateUserDto` (`PartialType`).

**Path Parameters:** `id` (`string`, UUID)

**Body (JSON), todos opcionais:**

| Campo | Tipo | Validação |
|---|---|---|
| `email` | `string` | `@IsEmail` |
| `password` | `string` | Mesma política de senha do registro |
| `phone` | `string` | `@IsPhoneNumber('BR')` |
| `name` | `string` | 3–100 caracteres |
| `role` | `"ADMIN" \| "EMPLOYEE" \| "CLIENT"` | — |

Se `password` for enviado, o serviço **re-aplica o hash argon2** (com `PASSWORD_PEPPER`), igual ao fluxo de criação/registro. Lança `404` se o usuário não existir.

**Resposta de sucesso:** `200 OK` com o usuário atualizado, **sem campos sensíveis** (`password` e tokens de verificação de e-mail são omitidos): `id`, `name`, `email`, `role`, `phone`, `cpf`, `emailVerifiedAt`, `createdAt`, `updatedAt`.

---

### POST /users 🔒 `ADMIN`

Cria um novo usuário (tipicamente `EMPLOYEE`/`ADMIN`) pelo painel administrativo.

**Body (JSON):** mesmo formato de [`CreateUserDto`](#post-authregister) (`email`, `password`, `phone`, `name`, `role?`).

**Regras de negócio:** Lança `409` se o e-mail já existir. Diferente do `/auth/register`, aqui o `role` enviado é respeitado (`createUserDto.role || UserRole.CLIENT`). A senha é armazenada com hash argon2 (+ `PASSWORD_PEPPER`).

**Resposta de sucesso:** `200 OK` com o usuário criado, **sem campos sensíveis** (mesmo formato do retorno de `PUT /users/:id`: `id`, `name`, `email`, `role`, `phone`, `cpf`, `emailVerifiedAt`, `createdAt`, `updatedAt`).

---

## Endereços (`/addresses`)

Fonte: [addresses.controller.ts](src/modules/addresses/addresses.controller.ts), [addresses.service.ts](src/modules/addresses/addresses.service.ts), [create-address.dto.ts](src/modules/addresses/dto/create-address.dto.ts)

> Todas as rotas exigem `JwtAuthGuard`. O `userId` é sempre extraído do usuário autenticado — nunca do payload.

### POST /addresses 🔒

Cria um novo endereço para o usuário autenticado.

**Body (JSON):**

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `label` | `string` | Sim | não vazio |
| `street` | `string` | Sim | não vazio |
| `number` | `string` | Sim | não vazio |
| `city` | `string` | Sim | não vazio |
| `district` | `string` | Sim | não vazio (bairro) |
| `zipCode` | `string` | Sim | formato `00000-000` |
| `complement` | `string` | Não | opcional (`@IsOptional`) |
| `country` | `string` | Sim | não vazio |
| `state` | `string` | Sim | não vazio |
| `isDefault` | `boolean` | Sim | — |

```json
{
  "label": "Casa",
  "street": "Rua das Flores",
  "number": "123",
  "city": "São Paulo",
  "district": "Jardins",
  "zipCode": "01310-100",
  "complement": "Apto 42",
  "country": "BR",
  "state": "SP",
  "isDefault": true
}
```

**Resposta de sucesso:** `200 OK` com o endereço criado (inclui `id`, `userId`, `createdAt`, `updatedAt`).

---

### GET /addresses 🔒

Lista todos os endereços do usuário autenticado.

**Resposta de sucesso:** `200 OK`

```json
[
  {
    "id": "a1b2...uuid",
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Apto 42",
    "district": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100",
    "country": "BR",
    "isDefault": true,
    "label": "Casa"
  }
]
```

---

### PATCH /addresses/:id 🔒

Atualiza parcialmente um endereço do usuário autenticado.

**Path Parameters:** `id` (`string`, UUID)

**Body (JSON):** qualquer subconjunto dos campos de criação (`PartialType`).

**Regras de negócio:** Lança `404` se o endereço não existir **ou não pertencer ao usuário autenticado** (a busca já filtra por `userId`).

**Resposta de sucesso:** `200 OK` com o endereço atualizado.

---

### PATCH /addresses/:id/set-default 🔒

Define um endereço como padrão, desmarcando o anterior automaticamente.

**Path Parameters:** `id` (`string`, UUID)

**Body:** Nenhum

**Resposta de sucesso:** `200 OK` com o endereço marcado como `isDefault: true`.

Lança `404` se o endereço de destino não existir/pertencer ao usuário.

---

## Produtos (`/products`)

Fonte: [products.controller.ts](src/modules/products/products.controller.ts), [products.service.ts](src/modules/products/products.service.ts), [create-product.dto.ts](src/modules/products/dto/create-product.dto.ts), [filter-products.dto.ts](src/modules/products/dto/filter-products.dto.ts)

### Categorias e tamanhos (enums do Prisma)

```
ProductCategory: BAG | WALLET | BACKPACK
ProductSize:     MINI | SMALL | MEDIUM | LARGE
```

### POST /products 🔒 `ADMIN`

Cria um novo produto com uma ou mais cores/variações, cada uma com suas próprias imagens. Requisição `multipart/form-data`.

**Autenticação:** `JwtAuthGuard` + `RolesGuard` (`ADMIN`)

**Content-Type:** `multipart/form-data`

**Campos do formulário:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `category` | `"BAG" \| "WALLET" \| "BACKPACK"` | Sim | Categoria do produto |
| `modelCode` | `string` | Sim | Código único do modelo |
| `name` | `string` | Sim | Nome do produto |
| `description` | `string` | Sim | Descrição |
| `material` | `string` | Sim | Material |
| `size` | `"MINI" \| "SMALL" \| "MEDIUM" \| "LARGE"` | Sim | Tamanho |
| `price` | `number` | Sim | Preço base |
| `promotionPrice` | `number` | Não | Preço promocional |
| `isPromotion` | `boolean` (`"true"`/`"false"`) | Não | Se o produto está em promoção (padrão `false`) |
| `isHighlighted` | `boolean` (`"true"`/`"false"`) | Não | Se o produto é destaque na vitrine (padrão `false`) |
| `releaseDate` | `string` (data ISO) | Não | Data de lançamento do produto |
| `defaultBoxWidth` | `number` | Sim | Largura da caixa padrão (cm), usada no cálculo de frete |
| `defaultBoxHeight` | `number` | Sim | Altura da caixa padrão (cm), usada no cálculo de frete |
| `defaultBoxLength` | `number` | Sim | Comprimento da caixa padrão (cm), usado no cálculo de frete |
| `defaultBoxWeight` | `number` | Sim | Peso da caixa padrão (kg), usado no cálculo de frete |
| `colors` | `string` (JSON serializado) | Sim | Array de objetos `{ colorName, hexCode?, stockQuantity? }` — enviado como string e parseado no servidor |
| `colors[N][images][]` | `File` | Não* | Arquivos de imagem da cor de índice `N` (correspondente à posição no array `colors`) |

\* O controller exige **pelo menos um arquivo no total** da requisição (`files.length > 0`), senão retorna `400 Bad Request`.

**Exemplo do campo `colors` (antes de serializar para string):**
```json
[
  { "colorName": "Preta", "hexCode": "#000000", "stockQuantity": 10 },
  { "colorName": "Caramelo", "hexCode": "#C68642", "stockQuantity": 5 }
]
```

**Regras de negócio:**
- As imagens são salvas em `uploads/products/<uuid>.<ext>` e servidas por URL relativa `/uploads/products/<arquivo>`.
- Toda a criação (produto + cores + imagens) ocorre dentro de uma transação Prisma (`$transaction`).
- Após criar, o cache de listagem de produtos é invalidado (via versão incremental em Redis).

**Resposta de sucesso:** `200 OK` com o produto criado, incluindo `colors` e `images` aninhados.

---

### GET /products

Lista produtos com paginação e cache Redis (TTL configurável, chave derivada de hash dos filtros).

**Autenticação:** `OptionalJwtGuard` — não obrigatória, mas se o usuário autenticado for `ADMIN`, filtros administrativos extras (`name`, `size`, ordenação) são habilitados.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Disponível para | Descrição |
|---|---|---|---|---|
| `category` | `"BAG" \| "WALLET" \| "BACKPACK"` | Não | Todos | Filtra por categoria |
| `page` | `number` | Não (padrão 1) | Todos | Página |
| `limit` | `number` | Não (padrão 20) | Todos | Itens por página |
| `name` | `string` | Não | Somente `ADMIN` | Busca por nome (case-insensitive, `contains`) |
| `size` | `"MINI" \| "SMALL" \| "MEDIUM" \| "LARGE"` | Não | Somente `ADMIN` | Filtro exato de tamanho |
| `date` | `"asc" \| "desc"` | Não | Somente `ADMIN` | Ordenação por `createdAt` |
| `price` | `"asc" \| "desc"` | Não | Somente `ADMIN` | Ordenação por `price` |

> Usuários não-admin **não** têm acesso aos filtros `name`/`size`/`date`/`price` — esses parâmetros são silenciosamente ignorados pelo serviço quando `isAdmin` é `false` (embora ainda passem pela validação do DTO, que não distingue papel).

**Resposta de sucesso:** `200 OK`

```json
{
  "data": [
    {
      "id": "d4e5...uuid",
      "category": "BAG",
      "modelCode": "BOL-001",
      "name": "Bolsa Couro Premium",
      "description": "Bolsa de couro legítimo.",
      "material": "Couro legítimo",
      "isPromotion": true,
      "price": "299.90",
      "promotionPrice": "249.90",
      "size": "MEDIUM",
      "defaultBoxWidth": "20.00",
      "defaultBoxHeight": "20.00",
      "defaultBoxLength": "30.00",
      "defaultBoxWeight": "0.50",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "colors": [
        {
          "id": "f6a7...uuid",
          "colorName": "Preta",
          "hexCode": "#000000",
          "stockQuantity": 10,
          "images": [
            { "id": "...", "url": "/uploads/products/abc.jpg", "altText": "Bolsa Couro Premium - Preta", "displayOrder": 0 }
          ]
        }
      ]
    }
  ],
  "total": 24,
  "page": 1,
  "limit": 20
}
```

---

### GET /products/:id

Retorna um produto específico com cores e imagens (cache individual por produto).

**Autenticação:** Não requerida

**Path Parameters:** `id` (`string`, UUID)

**Resposta de sucesso:** `200 OK` — mesmo formato de item do array acima. Retorna `null` (200) se o produto não existir (o serviço não lança `NotFoundException` neste método).

---

### PUT /products/:id 🔒 `ADMIN`

Atualiza os dados de um produto existente. Também aceita `multipart/form-data`.

**Autenticação:** `JwtAuthGuard` + `RolesGuard` (`ADMIN`)

**Path Parameters:** `id` (`string`, UUID)

**Campos do formulário:** mesmos campos de criação, todos opcionais (`PartialType`). Cada objeto de `colors` pode incluir um `id` (string) para atualizar uma cor existente; sem `id`, uma nova cor é criada. Arquivos de imagem seguem a mesma convenção da criação: `colors[N][images][]`, onde `N` é o índice da cor no array.

**Regras de negócio importantes:**
- Toda a atualização ocorre dentro de uma transação Prisma (`$transaction`). Lança `404` se o produto não existir.
- Os campos escalares do produto são atualizados via `tx.product.update`.
- Se `colors` for enviado: cada cor com `id` é atualizada (`colorName`, `hexCode`, `stockQuantity`); cada cor sem `id` é criada; e as cores existentes que **não** constam no payload são removidas (cascade remove as imagens). Se `colors` for omitido, as cores existentes são mantidas intactas.
- Arquivos enviados são salvos em `uploads/products/<uuid>.<ext>` e associados como `Image` à cor do índice correspondente, com `displayOrder` sequencial a partir da última imagem já existente daquela cor.
- Invalida o cache do produto (`product:<id>`) e a versão da listagem.

**Resposta de sucesso:** `200 OK` com o produto atualizado, incluindo `colors` e `images` aninhados.

---

### DELETE /products/:id

Remove um produto permanentemente (cascade em `colors`, `images` por FK `onDelete: Cascade`).

**Autenticação:** `JwtAuthGuard` + `RolesGuard` (`ADMIN`) — igual às demais rotas de escrita do módulo.

**Path Parameters:** `id` (`string`, UUID)

**Resposta de sucesso:** `200 OK`, sem corpo.

---

## Carrinho (`/carts`)

Fonte: [carts.controller.ts](src/modules/carts/carts.controller.ts), [carts.service.ts](src/modules/carts/carts.service.ts), [create-cart.dto.ts](src/modules/carts/dto/create-cart.dto.ts)

> Todas as rotas exigem `JwtAuthGuard`. O carrinho é sempre resolvido pelo par `(userId, status=ACTIVE)` — cada usuário tem no máximo um carrinho ativo por vez; ao finalizar a compra (`checkout`), o status muda para `CHECKED_OUT` e um novo carrinho é criado na próxima adição de item.

### GET /carts 🔒

Retorna o carrinho ativo do usuário autenticado, com a contagem total de itens.

**Resposta de sucesso:** `200 OK`

```json
{
  "cart": {
    "id": "e1f2...uuid",
    "userId": "b3f1...uuid",
    "status": "ACTIVE",
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-01T10:00:00.000Z",
    "items": [
      {
        "id": "9c8b...uuid",
        "quantity": 2,
        "productColor": {
          "id": "f6a7...uuid",
          "colorName": "Preta",
          "images": [
            { "id": "a1b2...uuid", "url": "/uploads/products/foo.jpg", "altText": null, "displayOrder": 0 }
          ]
        },
        "product": {
          "id": "d4e5...uuid",
          "name": "Bolsa Couro Premium",
          "category": "BAG",
          "price": "299.90",
          "promotionPrice": null,
          "isPromotion": false
        }
      }
    ]
  },
  "totalItems": 2
}
```

Se não houver carrinho ativo, `cart` é `null` e `totalItems` é `undefined`. `productColor.images` traz no máximo 1 imagem (a de menor `displayOrder`) — pensado para exibição de miniatura no carrinho, não a galeria completa.

---

### GET /carts/shipping-quote 🔒

Calcula opções de frete para o carrinho ativo do usuário, com base no CEP informado, usando a integração Melhor Envio.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `zipCode` | `string` | Sim | CEP de destino |

**Regras de negócio:** Lança `400 Bad Request` se o carrinho estiver vazio ou não existir. As dimensões/peso de cada pacote vêm dos campos `defaultBoxWidth/Height/Length/Weight` de cada produto no carrinho.

**Resposta de sucesso:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "PAC",
    "company": { "id": 1, "name": "Correios", "picture": "https://..." },
    "price": "18.50",
    "deliveryMin": 5,
    "deliveryMax": 7
  },
  {
    "id": 2,
    "name": "SEDEX",
    "company": { "id": 1, "name": "Correios", "picture": "https://..." },
    "price": "35.00",
    "deliveryMin": 1,
    "deliveryMax": 2
  }
]
```

---

### POST /carts/items 🔒

Adiciona um item ao carrinho ativo do usuário (cria o carrinho automaticamente se não existir).

**Body (JSON):**

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `productId` | `string` | Sim | não vazio |
| `productColorId` | `string` | Sim | não vazio (variação de cor do produto) |
| `quantity` | `number` | Não (padrão 1) | inteiro entre 1 e 10 |

```json
{ "productId": "d4e5...uuid", "productColorId": "f6a7...uuid", "quantity": 2 }
```

**Regras de negócio:** Se já existir um item com o mesmo par `(productId, productColorId)` no carrinho, a quantidade é **somada** à existente (não substituída) — sem validação de limite de 10 nesse caso de soma.

**Resposta de sucesso:** `200 OK` — retorna o carrinho atualizado (mesmo formato de `GET /carts`).

---

### PATCH /carts/items/:id 🔒

Define a quantidade absoluta de um item do carrinho.

**Path Parameters:** `id` (`string`, UUID do `CartItem`)

**Body (JSON):**

| Campo | Tipo | Obrigatório |
|---|---|---|
| `quantity` | `number` | Sim |

**Regras de negócio:** Lança `404` se o item não existir ou não pertencer ao usuário autenticado (filtro `cart: { userId }`).

**Resposta de sucesso:** `200 OK` — carrinho atualizado.

---

### DELETE /carts/items 🔒

Esvazia completamente o carrinho ativo do usuário (remove todos os `CartItem`).

**Body:** Nenhum

**Resposta de sucesso:** `200 OK` — carrinho vazio.

---

### DELETE /carts/items/:id 🔒

Remove ou decrementa um item específico do carrinho.

**Path Parameters:** `id` (`string`, UUID do `CartItem`)

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `quantity` | `number` | Não | Se informado, decrementa essa quantidade do item; se omitido, remove o item por completo |

```json
{ "quantity": 1 }
```

**Regras de negócio:**
- Lança `404` se o item não existir/pertencer ao usuário.
- Lança `400` se `quantity` for maior que a quantidade atual do item.
- ⚠️ Bug observado: quando `quantity === cartItem.quantity` (remoção total via quantidade), o código executa **tanto** `delete` **quanto**, em seguida, `update` sobre o mesmo registro já deletado — isso resultará em erro do Prisma (`RecordNotFound`) nesse caso específico. Recomenda-se revisar essa lógica em [carts.service.ts:82-95](src/modules/carts/carts.service.ts#L82-L95).

**Resposta de sucesso:** `200 OK` — carrinho atualizado.

---

## Pedidos (`/orders`)

Fonte: [orders.controller.ts](src/modules/orders/orders.controller.ts), [orders.service.ts](src/modules/orders/orders.service.ts), [checkout.dto.ts](src/modules/orders/dto/checkout.dto.ts)

### Status do pedido (`OrderStatus`)

```
PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED
```

> Migrado de `PENDING | PROCESSING | COMPLETED | CANCELLED` (2026-07-23) para distinguir "pago,
> aguardando envio" (`CONFIRMED`) de "enviado" (`SHIPPED`) — ver `TODO.md` item 5.4. O antigo
> `PROCESSING` foi renomeado para `CONFIRMED`; `COMPLETED` foi renomeado para `DELIVERED`; `SHIPPED`
> é um valor novo, inserido entre os dois. `PENDING`/`CANCELLED` não mudaram.

### POST /orders/checkout 🔒

Converte o carrinho ativo do usuário em um pedido formal (`Order`), calculando frete e total.

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `addressId` | `string` | Sim | Endereço de entrega (deve pertencer ao usuário) |
| `shippingServiceId` | `number` | Sim | ID do serviço de frete escolhido (retornado por `GET /carts/shipping-quote`) |

```json
{ "addressId": "a1b2...uuid", "shippingServiceId": 1 }
```

**Regras de negócio:**
1. Lança `400` se o carrinho estiver vazio.
2. Lança `404` se o endereço não existir/não pertencer ao usuário.
3. Recalcula as opções de frete em tempo real via Melhor Envio e valida que `shippingServiceId` está entre as opções retornadas (`400` caso contrário).
4. Preço unitário de cada item usa `promotionPrice` se `isPromotion` for `true`, senão `price`.
5. Gera `orderNumber` no formato `ML-<timestamp>`.
6. Marca o carrinho como `CHECKED_OUT` (o usuário passará a ter um novo carrinho ativo na próxima adição de item).
7. **Não define o método/gateway de pagamento aqui** — isso é feito em uma chamada subsequente a `POST /payments/card` ou `POST /payments/pix`.

**Resposta de sucesso:** `200 OK`

```json
{
  "orderId": "9f8e...uuid",
  "orderNumber": "ML-1710000000000",
  "totalAmount": 318.40,
  "payer": { "email": "joao@email.com", "name": "João Silva" }
}
```

---

### GET /orders 🔒 `ADMIN`

Lista pedidos (na verdade, carrinhos com seus pedidos associados) para o painel administrativo, com paginação.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `page` | `number` | Não (padrão 1) | Página |
| `limit` | `number` | Não (padrão 20) | Itens por página |
| `customerName` | `string` | Não | Filtra por nome do cliente (case-insensitive, `contains`) |
| `status` | `OrderStatus` | Não | Filtra pelos carrinhos cujo pedido está no status informado (`PENDING`/`CONFIRMED`/`SHIPPED`/`DELIVERED`/`CANCELLED`) |
| `startDate` | `string` (data ISO) | Não | Data inicial (inclusive) sobre `createdAt` do carrinho |
| `endDate` | `string` (data ISO) | Não | Data final (inclui o dia inteiro) sobre `createdAt` do carrinho |

> Os filtros são validados por um `FilterOrdersDto` dedicado e traduzidos para um `where` tipado do Prisma; a listagem é restrita a carrinhos finalizados (`status = CHECKED_OUT`). Chaves não declaradas no DTO são removidas pelo `ValidationPipe`.

**Resposta de sucesso:** `200 OK`

```json
{
  "data": [
    {
      "id": "e1f2...uuid",
      "order": {
        "id": "c7d8...uuid",
        "orderNumber": "ML-1710000000000",
        "status": "PENDING",
        "subtotal": "299.90",
        "shippingCost": "18.50",
        "discount": "0.00",
        "totalAmount": "318.40",
        "paymentMethod": null,
        "address": {
          "id": "a1b2...uuid",
          "street": "Rua das Flores",
          "number": "123",
          "complement": "Apto 42",
          "district": "Jardins",
          "city": "São Paulo",
          "state": "SP",
          "zipCode": "01310-100",
          "country": "BR"
        },
        "trackingCode": null
      },
      "totalItems": 2,
      "status": "CHECKED_OUT",
      "cartItems": [
        {
          "id": "9c8b...uuid",
          "quantity": 2,
          "productColor": {
            "id": "f6a7...uuid",
            "colorName": "Preta",
            "images": [
              { "id": "img1...uuid", "url": "https://.../foto.jpg", "altText": null, "displayOrder": 0 }
            ]
          },
          "product": { "id": "d4e5...uuid", "name": "Bolsa Couro Premium", "category": "BAG", "modelCode": "BC-001" }
        }
      ],
      "user": {
        "id": "b3f1...uuid",
        "email": "joao@email.com",
        "role": "CLIENT",
        "phone": "11999999999",
        "name": "João Silva"
      }
    }
  ],
  "currentPage": 1,
  "lastPage": 5,
  "total": 48
}
```

> Note que `status` no nível raiz do objeto é o **status do carrinho** (`CartStatus`: `ACTIVE`/`CHECKED_OUT`), enquanto `order.status` é o **status do pedido** (`OrderStatus`). Não confundir os dois.

---

### GET /orders/me 🔒

Lista todos os pedidos finalizados (`CHECKED_OUT`) do usuário autenticado, sem paginação.

**Resposta de sucesso:** `200 OK` — array no mesmo formato de `data` acima, mas com `product` incluindo mais campos (`modelCode`, `description`, `material`, `price`, `promotionPrice`, `isPromotion`, `bagDetails`) e `productColor` incluindo `hexCode`/`stockQuantity`, além de `order.paymentStatus` e `order.completedAt`.

---

### GET /orders/:id 🔒 `ADMIN`

Retorna os detalhes de um pedido (carrinho) específico por `id` do carrinho.

**Path Parameters:** `id` (`string`, UUID do **carrinho**, não do pedido)

**Resposta de sucesso:** `200 OK` — mesmo formato de item de `GET /orders`.

Lança `404` se o carrinho não existir.

---

### PATCH /orders/:id 🔒 `ADMIN`

Atualiza campos arbitrários de um pedido (ex.: `trackingCode`, `status`).

**Path Parameters:** `id` (`string`, UUID do **pedido**, `Order.id` — diferente do parâmetro de `GET /orders/:id`)

**Body (JSON):** validado por `UpdateOrderDto` — apenas os campos abaixo são aceitos; quaisquer outros são removidos pelo `ValidationPipe`.

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `trackingCode` | `string` | Não | — |
| `status` | `OrderStatus` | Não | `PENDING` \| `CONFIRMED` \| `SHIPPED` \| `DELIVERED` \| `CANCELLED` |

**Regras de negócio:** Lança `404` se o pedido não existir. Somente `trackingCode` e `status` são gravados — campos sensíveis como `paymentStatus`/`totalAmount` não podem ser alterados por esta rota.

```json
{ "trackingCode": "BR123456789", "status": "SHIPPED" }
```

**Resposta de sucesso:** `200 OK` com o pedido atualizado.

---

### POST /orders/:id/cancel 🔒 `ADMIN`

Cancela um pedido, definindo `status = CANCELLED`.

**Path Parameters:** `id` (`string`, UUID do pedido)

**Body:** Nenhum

**Resposta de sucesso:** `200 OK` com o pedido atualizado.

---

## Pagamentos (`/payments`)

Fonte: [payments.controller.ts](src/modules/payments/payments.controller.ts), [payments.service.ts](src/modules/payments/payments.service.ts), integração [payment.service.ts](src/integrations/payment/payment.service.ts) (Mercado Pago SDK)

> Todas as rotas exigem `JwtAuthGuard`. Os pedidos referenciados devem pertencer ao usuário autenticado (`order.findFirst({ where: { id, userId } })`).

### Idempotência

Todas as rotas de criação de pagamento aceitam o header opcional:

```
Idempotency-Key: <string>
```

Se não enviado, a API gera uma chave própria (`order:<orderId>:CARD` ou `order:<orderId>:PIX`). Se já existir uma tentativa de pagamento (`PaymentAttempt`) com o mesmo par `(provider, idempotencyKey)`, a API **retorna a tentativa existente sem criar um novo pagamento no Mercado Pago** — importante para evitar cobranças duplicadas em caso de retry do cliente.

### POST /payments/card 🔒

Cria um pagamento com cartão de crédito via Mercado Pago para um pedido existente.

**Headers:** `Idempotency-Key` (opcional, recomendado)

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `orderId` | `string` | Sim | ID do pedido (`Order.id`) |
| `cardToken` | `string` | Sim | Token do cartão gerado no client-side pelo SDK do Mercado Pago |
| `paymentMethodId` | `string` | Sim | Ex.: `"master"`, `"visa"` |
| `issuerId` | `string` | Não | ID do banco emissor |
| `installments` | `number` | Sim | Número de parcelas (mínimo 1) |
| `payer.email` | `string` | Sim | E-mail do pagador |
| `payer.name` | `string` | Não | Nome do pagador |
| `payer.cpf` | `string` | Não | CPF do pagador (usado como `identification.number` tipo `CPF`) |

```json
{
  "orderId": "9f8e...uuid",
  "cardToken": "ff8080814c...",
  "paymentMethodId": "master",
  "installments": 3,
  "payer": { "email": "joao@email.com", "name": "João Silva", "cpf": "12345678900" }
}
```

**Regras de negócio:**
- Lança `404` se o pedido não existir/não pertencer ao usuário.
- Lança `400` se o pedido já estiver com `paymentStatus = APPROVED`.
- O valor cobrado é sempre `order.totalAmount` (não é aceito valor do client), prevenindo manipulação de preço.

**Resposta de sucesso:** `200 OK`

```json
{
  "attemptId": "1a2b...uuid",
  "paymentId": 123456789,
  "status": "APPROVED",
  "statusDetail": "accredited"
}
```

`status` reflete o enum interno `PaymentStatus`: `PENDING | APPROVED | REJECTED | REFUNDED | CANCELLED`.

---

### POST /payments/pix 🔒

Cria um pagamento via Pix para um pedido existente e retorna o QR Code.

**Headers:** `Idempotency-Key` (opcional, recomendado)

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `orderId` | `string` | Sim | ID do pedido |
| `payer.email` | `string` | Sim | E-mail do pagador |
| `payer.name` | `string` | Não | Nome do pagador |
| `payer.cpf` | `string` | Não | CPF do pagador |

```json
{
  "orderId": "9f8e...uuid",
  "payer": { "email": "joao@email.com", "name": "João Silva", "cpf": "12345678900" }
}
```

**Regras de negócio:** mesmas validações de pedido/idempotência da rota de cartão.

**Resposta de sucesso:** `200 OK`

```json
{
  "attemptId": "1a2b...uuid",
  "paymentId": 123456790,
  "status": "PENDING",
  "pix": {
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "qrCodeBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "expirationDate": "2024-03-01T11:00:00.000-03:00"
  }
}
```

---

### GET /payments/:orderId/status 🔒

Consulta o status de pagamento atual de um pedido (dados já persistidos no banco — não consulta o Mercado Pago em tempo real).

**Path Parameters:** `orderId` (`string`, UUID do pedido)

**Resposta de sucesso:** `200 OK`

```json
{
  "id": "9f8e...uuid",
  "paymentStatus": "APPROVED",
  "paymentMethod": "master",
  "externalPaymentId": "123456789",
  "paymentProvider": "MERCADO_PAGO",
  "paymentType": "CARD",
  "updatedAt": "2024-03-01T10:05:00.000Z"
}
```

Lança `404` se o pedido não existir/não pertencer ao usuário.

---

## Webhooks (`/webhooks`)

Fonte: [payment.controller.ts](src/integrations/payment/payment.controller.ts)

### POST /webhooks/mercadopago

Endpoint público chamado pelo Mercado Pago para notificar mudanças de status de pagamento assincronamente. **Não deve ser chamado manualmente pelo frontend.**

**Autenticação:** Nenhuma (validação por assinatura HMAC, ver abaixo)

**Headers relevantes (enviados pelo Mercado Pago):**

| Header | Descrição |
|---|---|
| `x-signature` | Assinatura HMAC-SHA256 no formato `ts=...,v1=...` |
| `x-request-id` | ID da requisição, usado no cálculo da assinatura |

**Query Parameters:** `data.id` (opcional, id do pagamento — normalmente vem no `body.data.id`)

**Body (JSON):** payload padrão de webhook do Mercado Pago (`type`, `action`, `data.id`, etc.)

**Regras de negócio:**
1. Se `MERCADOPAGO_WEBHOOK_SECRET` estiver configurado, a assinatura é validada via HMAC-SHA256 com comparação em tempo constante (`crypto.timingSafeEqual`). Requisições com assinatura inválida são **ignoradas silenciosamente** (retornam `200` sem processar, para evitar retentativas infinitas do Mercado Pago).
2. Se a variável de ambiente não estiver configurada, a validação é **pulada** (apenas com log de aviso) — recomendado sempre configurar em produção.
3. Eventos com `type !== 'payment'` são ignorados.
4. Busca os detalhes do pagamento diretamente na API do Mercado Pago (`getPaymentInfo`) e mapeia o status para o enum interno `PaymentStatus`.
5. Cria ou atualiza um registro `PaymentAttempt` (chave de idempotência: `webhook:<paymentId>`) e atualiza o `Order` correspondente (`externalReference` do Mercado Pago = `Order.id`).

**Resposta:** sempre `200 OK`

```json
{ "received": true }
```

---

## Modelo de dados

Resumo das entidades principais definidas em [schema.prisma](prisma/schema.prisma) (nomes de tabela entre parênteses):

### User (`users`)
`id`, `email` (único), `password` (hash argon2), `role` (`UserRole`), `cpf?` (único), `phone?`, `name?`, `emailVerifiedAt?`, `emailVerificationToken?`, `emailVerificationTokenExpiresAt?`, `emailVerificationTokenSentAt?`, `createdAt`, `updatedAt`. Relaciona-se com `Address[]`, `Cart[]`, `Order[]` (como comprador e, opcionalmente, como quem concluiu o pedido — `completedBy`), `RefreshToken[]`.

### Address (`addresses`)
`id`, `userId`, `street`, `number`, `complement?`, `district`, `city`, `state`, `zipCode`, `country` (padrão `"BR"`), `isDefault`, `label`. Exclusão em cascata ao remover o usuário.

### Product (`products`)
`id`, `category` (`ProductCategory`), `modelCode` (único), `name`, `description`, `material`, `isPromotion`, `isHighlighted` (destaque na vitrine), `price`, `promotionPrice?`, `releaseDate?` (data de lançamento), `size` (`ProductSize`), `defaultBoxWidth/Height/Length/Weight` (usados no cálculo de frete), `colors: ProductColor[]`, `bagDetails?`/`backpackDetails?` (tabelas de detalhe ainda praticamente vazias — apenas relação 1:1 com o produto, sem campos próprios além do id).

### ProductColor (`product_colors`)
`id`, `productId`, `colorName`, `hexCode?`, `stockQuantity` (padrão 0), `images: Image[]`. Restrição única em `(productId, colorName)`.

### Image (`images`)
`id`, `productColorId`, `url`, `altText?`, `displayOrder`.

### Cart (`carts`) / CartItem (`cart_items`)
Um carrinho por usuário com `status` (`ACTIVE`/`CHECKED_OUT`). Cada item liga `product` + `productColor` + `quantity`, com unicidade em `(cartId, productId, productColorId)`.

### Order (`orders`) / OrderItem (`order_items`)
Pedido gerado a partir de um carrinho no checkout. Campos principais: `orderNumber` (único, formato `ML-<timestamp>`), `status` (`OrderStatus`), `trackingCode?` (único), `subtotal`, `shippingCost`, `discount`, `totalAmount`, `paymentMethod?`, `paymentStatus` (`PaymentStatus`), `externalPaymentId?`, `paymentProvider?` (`MERCADO_PAGO`), `paymentType?` (`CARD`/`PIX`), `shippingServiceId?`, `shippingLabel?`, `completedAt?`, `completedById?`. Relaciona-se com `PaymentAttempt[]`.

### PaymentAttempt (`payment_attempts`)
Registro de cada tentativa de pagamento (permite múltiplas tentativas por pedido). Chave de idempotência única por `(provider, idempotencyKey)` e por `(provider, mpPaymentId)`. Guarda dados específicos de Pix (`pixQrCode`, `pixQrCodeBase64`, `pixExpiresAt`) e do Mercado Pago (`mpPaymentId`, `mpStatus`, `mpStatusDetail`).

### RefreshToken
`id`, `token` (hash, único), `userId`, `expiresAt`, `createdAt`. Índices em `userId` e `token`.

---

## Variáveis de ambiente relevantes

Fonte: `.env` (não versionado) e uso em código.

| Variável | Uso |
|---|---|
| `PORT` | Porta HTTP do servidor (padrão `3000`) |
| `DATABASE_URL` | Conexão PostgreSQL (Prisma) |
| `FRONTEND_URL` | Origem permitida no CORS e usada nos `back_urls` do Mercado Pago |
| `BACKEND_URL` | Base usada para montar a `notification_url` dos webhooks do Mercado Pago |
| `REDIS_URL` | Conexão Redis para cache (`Keyv`) |
| `CACHE_TTL_MS` | TTL padrão do cache de leitura (produtos, `/auth/me`) — padrão 60000ms |
| `PASSWORD_PEPPER` | Pimenta concatenada à senha antes do hash argon2 |
| `JWT_SECRET` | Chave de assinatura do `access_token` |
| `MERCADOPAGO_ACCESS_TOKEN` | Credencial do SDK do Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | Segredo para validar a assinatura HMAC dos webhooks |
| `MELHOR_ENVIO_TOKEN` | Credencial da API do Melhor Envio |
| `MELHOR_ENVIO_API_URL` | Base URL da API do Melhor Envio (sandbox ou produção) |
| `MELHOR_ENVIO_FROM_ZIPCODE` | CEP de origem usado no cálculo de frete |

---

## Pontos de atenção identificados no código (para revisão futura)

Itens já resolvidos (mantidos aqui como histórico):

- ✅ **`DELETE /products/:id`** passou a exigir `JwtAuthGuard` + `RolesGuard(ADMIN)`.
- ✅ **`PUT /products/:id`** agora persiste `colors`/`images` (upsert de cores e criação de imagens) dentro da transação.
- ✅ **`GET /orders`** e **`PATCH /orders/:id`** agora usam DTOs tipados (`FilterOrdersDto`/`UpdateOrderDto`); o `PATCH` grava apenas `trackingCode`/`status`.
- ✅ **`PUT /users/:id`** re-aplica o hash argon2 quando `password` é enviado; `PUT`/`POST /users` não retornam mais `password`/tokens de verificação.
- ✅ **`POST /auth/refresh`** (e `POST /auth/login`) podiam retornar `500` sob concorrência: o fluxo lê o refresh token antigo, valida, e depois o apaga por `id` sem lock — duas requisições concorrentes (duas abas, ou o retry-on-401 do frontend disparando em paralelo) podiam ler o mesmo token e a segunda `delete` falhava com `P2025` (registro já removido pela primeira). Corrigido tratando `P2025` como não-erro (o estado desejado — token antigo removido — já foi alcançado) em `auth.service.ts#login` e `#refreshToken`. O frontend (`apiInstance.ts`) também passou a compartilhar uma única chamada de refresh em voo entre 401s concorrentes na mesma aba, reduzindo a frequência da corrida (mas não elimina o caso multi-aba, daí a correção no backend ser a definitiva).
- ✅ **`DELETE /carts/items/:id`** (remoção com `quantity` igual à quantidade atual) executava `delete` seguido de `update` no mesmo registro, lançando `P2025` (não tratado) e retornando um `500` genérico. Corrigido em [carts.service.ts](src/modules/carts/carts.service.ts) trocando o segundo `if` por um `else`, para que o `update` só rode quando a remoção for parcial.
- ✅ **`POST /auth/register`** retornava o `phone` como a string fixa `"Desconhecido"` em vez do telefone enviado: o `phone` do `CreateUserDto` era validado mas nunca repassado ao `prisma.user.create`. Corrigido em `auth.service.ts#register`.
- ✅ **`PATCH /addresses/:id`** e **`PATCH /addresses/:id/set-default`** quebravam sempre: `addresses.service.ts` chamava `prisma.address.findUnique({ where: { id, userId } })`/`prisma.address.update({ where: { id, userId } })`, mas `Address` não tem `@@unique([id, userId])` no schema — apenas `id` é único isoladamente, e `findUnique`/`update` do Prisma exigem que o `where` seja exatamente um campo único (ou uma unique composta declarada). Corrigido trocando `findUnique({id, userId})` por `findFirst({id, userId})` para a checagem de posse (mesmo padrão de `carts.service.ts`), seguido de `update({where: {id}})` puro já com a posse confirmada.
- ✅ **`POST /addresses`** exigia `complement` não vazio (`@IsNotEmpty`, sem `@IsOptional`) mesmo o campo `complement` sendo nullable no schema Prisma (`String?`) — endereços sem complemento (comum) eram rejeitados com `400`, forçando o cliente a inventar um valor. Corrigido adicionando `@IsOptional()` em `CreateAddressDto.complement` (mesmo padrão dos demais campos opcionais do backend, ex. `Product.releaseDate`).

Pendências ainda em aberto:

1. O envio real de e-mails de verificação **ainda não está implementado** — os endpoints de verificação apenas manipulam tokens no banco.
3. **Login via Google não está implementado no backend.** O frontend referencia um fluxo (`GoogleButton.tsx` redireciona para `${API_URL}/auth/google/redirect`; `GoogleCallback.tsx` espera ser redirecionado de volta com `?success=true|false` e sessão já estabelecida via cookie HTTPOnly) que **não existe hoje**: não há dependência `passport-google-oauth20`, nenhuma strategy de Google, e `auth.controller.ts` não expõe nenhuma rota `/auth/google/*`. Não é um caso de contrato não-documentado — é uma feature nunca construída no backend. Fora do escopo do plano de integração da storefront (ver `TODO.md`); implementá-la exigiria trabalho novo de backend (client OAuth do Google Cloud, strategy Passport, rotas de redirect/callback, emissão de cookie no sucesso).
2. **`PaymentService#createPreference`** (`src/integrations/payment/payment.service.ts`) — código morto, sem nenhuma controller chamando-o. Gera um link de checkout hospedado (Mercado Pago Preference) e aponta `back_urls` para `/orders/success|failure|pending` no frontend, rotas que **não existem** no router atual. O fluxo de pagamento real e planejado (checkout → `POST /payments/card` ou `POST /payments/pix`, tokenização client-side/QR Pix) não usa preferência hospedada. **Decisão do usuário (2026-07-23): manter o código como está**, apenas documentado aqui como historicamente morto/estacionado — não usar como referência de fluxo ativo, e não é bloqueante para a integração da storefront. Revisar apenas se um fluxo de checkout hospedado vier a ser desejado no futuro.
