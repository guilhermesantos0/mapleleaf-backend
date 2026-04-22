# MapleLeaf Backend — Documentação da API

Esta documentação descreve como integrar o **Front-end** com a API do MapleLeaf (NestJS).

---

## Visão geral

- **Base URL**: `{{API_BASE_URL}}/api`
  - Ex.: local `http://localhost:3000/api`
- **Formato**: JSON (exceto endpoints de upload, que usam `multipart/form-data`)
- **Autenticação**: via **cookies HTTP-only**
  - `access_token` (15 min)
  - `refresh_token` (7 dias)
- **CORS**: habilitado com `credentials: true` e `origin = FRONTEND_URL`
  - No browser, o Front **precisa** enviar credenciais nas requisições (`credentials: 'include'` no fetch / `withCredentials: true` no axios).

---

## Convenções importantes

### Prefixo global
Todos os endpoints abaixo já consideram o prefixo global `/api`.

### Autenticação e sessão (cookies)
- Login grava `access_token` e `refresh_token` como cookies **HTTP-only**.
- Rotas protegidas exigem `access_token` válido.
- Para renovar tokens, use `/auth/refresh` (lê `refresh_token` do cookie).

### Perfis (roles)
Algumas rotas exigem perfil **ADMIN** (ex.: criar/editar produtos, consultar pedidos/admin, gestão de usuários).

### Validação de payload
Os DTOs usam `class-validator` com:
- `whitelist: true` (campos não declarados são removidos)
- `forbidNonWhitelisted: true` (campos extras podem gerar erro 400)
- `transform: true` (conversões simples podem ocorrer)

### Erros (padrão NestJS)
Em caso de erro, a API tende a responder com:

```json
{
  "statusCode": 400,
  "message": ["..."] ,
  "error": "Bad Request"
}
```

Observações:
- `message` pode ser **string** ou **array** (ex.: validações).
- Códigos comuns: `400`, `401`, `403`, `404`.

---

## Imagens / uploads

Ao cadastrar produto, as imagens são salvas em disco e referenciadas com URLs relativas no formato:

- `/uploads/products/{{filename}}`

O Front deve montar a URL final usando o domínio da API:

- `{{API_BASE_URL}}/uploads/products/{{filename}}`

> Importante: o backend salva a URL relativa, mas **não há configuração explícita de servidor estático** no `main.ts`. Em produção, normalmente isso é servido via reverse proxy (Nginx/CDN) ou configuração adicional do Nest. Garanta que a rota `/uploads` esteja exposta no ambiente.

---

## Endpoints

### Healthcheck
#### `GET /`
Retorna uma string simples (healthcheck básico).

**Resposta 200**
```json
"Hello World!"
```

---

## Auth (`/auth`)

### `POST /auth/register`
Cria um usuário (por padrão, role `CLIENT`).

**Body**
```json
{
  "email": "cliente@exemplo.com",
  "password": "Senha@123",
  "phone": "11999999999",
  "name": "Nome do Cliente"
}
```

Regras relevantes:
- `password`: 8–32, precisa conter maiúscula, minúscula, número e especial.
- `phone`: validado como BR; pode ser enviado com máscara (o backend remove não-dígitos).

**Resposta 201**
```json
{
  "message": "Usuário cadastrado com sucesso",
  "user": { "id": "..." }
}
```

### `POST /auth/login`
Autentica e grava cookies `access_token` e `refresh_token`.

**Body**
```json
{
  "email": "cliente@exemplo.com",
  "password": "Senha@123"
}
```

**Resposta 200**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": "...",
    "email": "...",
    "role": "CLIENT"
  }
}
```

### `POST /auth/refresh`
Renova tokens usando `refresh_token` (cookie).

**Resposta 200**
```json
{
  "message": "Token atualizado",
  "user": { "id": "...", "email": "..." }
}
```

### `POST /auth/logout` (protegido)
Invalida sessão e limpa cookies.

**Resposta 200**
```json
{ "message": "Logout realizado com sucesso" }
```

### `GET /auth/me` (protegido)
Retorna o usuário da sessão.

**Resposta 200**
```json
{
  "message": "Usuário obtido com sucesso",
  "user": { "id": "...", "email": "...", "role": "CLIENT" }
}
```

### `POST /auth/verify-email` (protegido)
Marca/verifica e-mail (detalhes do payload de retorno dependem do service).

### `POST /auth/resend-email-verification` (protegido)
Reenvia verificação (detalhes dependem do service).

---

## Produtos (`/products`)

### `GET /products` (público; opcionalmente autenticado)
Lista produtos com filtros/paginação.

**Query params**
- `category` (enum `ProductCategory`)
- `name` (string)
- `date` (`asc|desc`) *(somente admin)*
- `price` (`asc|desc`) *(somente admin)*
- `size` (`asc|desc`) *(somente admin)*
- `page` (number, default 1)
- `limit` (number, default 20)

**Resposta 200**
```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

### `GET /products/:id`
Detalhe de um produto.

### `POST /products` (ADMIN) — `multipart/form-data`
Cria um produto com **imagens por cor**.

**Campos (form-data)**
- `category` (enum)
- `modelCode` (string)
- `name` (string)
- `description` (string)
- `material` (string)
- `size` (enum)
- `price` (number)
- `promotionPrice` (number, opcional)
- `isPromotion` (`true|false`, opcional)
- `colors` (JSON string) — array de cores:
  - `colorName` (string)
  - `hexCode` (string, opcional)
  - `stockQuantity` (number, opcional)

**Upload de arquivos**
O backend espera campos de arquivo no padrão:
- `colors[0][images]`, `colors[1][images]`, ...

Cada cor pode ter várias imagens.

**Erros comuns**
- `400`: "É necessária pelo menos uma imagem" (quando não envia arquivos)

### `PUT /products/:id` (ADMIN) — `multipart/form-data`
Atualiza um produto. Aceita os mesmos campos do create (todos opcionais, por ser `PartialType`).

> Observação: no update atual, os arquivos são gravados em disco, mas não há criação explícita de registros de imagem associando ao produto/cor (ver `products.service.ts`).

### `DELETE /products/:id`
Remove um produto.

> Observação: no código atual não há `@UseGuards` no delete, então ele pode estar **público**. Se isso não for desejado, ajuste o guard.

---

## Carrinho (`/carts`) — protegido

### `GET /carts`
Obtém o carrinho ativo do usuário.

**Resposta 200**
```json
{
  "cart": {
    "id": "...",
    "status": "ACTIVE",
    "items": [
      {
        "id": "...",
        "quantity": 2,
        "productColor": { "id": "...", "colorName": "Preto" },
        "product": { "id": "...", "name": "Produto", "category": "..." }
      }
    ]
  },
  "totalItems": 2
}
```

### `POST /carts/items`
Adiciona item ao carrinho (cria carrinho se não existir).

**Body**
```json
{
  "productId": "prod_...",
  "productColorId": "color_...",
  "quantity": 1
}
```

### `PATCH /carts/items/:id`
Atualiza a quantidade de um item do carrinho.

**Body**
```json
{ "quantity": 3 }
```

### `DELETE /carts/items`
Remove todos os itens do carrinho do usuário.

### `DELETE /carts/items/:id`
Remove um item do carrinho.

**Body (opcional)**
```json
{ "quantity": 1 }
```

- Se `quantity` não for enviado, remove o item inteiro.
- Se `quantity` for igual à quantidade atual, o item é deletado.

### `GET /carts/shipping-quote?zipCode=00000-000`
Calcula opções de frete para o carrinho ativo.

**Query**
- `zipCode` (string)

**Resposta 200 (exemplo)**
```json
[
  {
    "id": 1,
    "name": "PAC",
    "company": { "id": 123, "name": "Correios", "picture": "..." },
    "price": "29.90",
    "deliveryMin": 3,
    "deliveryMax": 7
  }
]
```

Erros comuns:
- `400`: "Carrinho vazio"

---

## Pedidos (`/orders`) — protegido

### `POST /orders/checkout`
Fecha o carrinho (ACTIVE → CHECKED_OUT) e cria um pedido `PENDING`.

**Body**
```json
{
  "addressId": "addr_...",
  "shippingServiceId": 1
}
```

**Resposta 201**
```json
{
  "orderId": "order_...",
  "orderNumber": "ML-...",
  "totalAmount": 199.9,
  "payer": {
    "email": "cliente@exemplo.com",
    "name": "Nome do Cliente"
  }
}
```

Erros comuns:
- `400`: "Carrinho vazio"
- `404`: "Endereço não encontrado"
- `400`: "Serviço de frete inválido"

### `GET /orders/me`
Lista pedidos do usuário (carrinhos com status `CHECKED_OUT`), com detalhes do pedido e itens.

### `GET /orders` (ADMIN)
Lista pedidos (admin), com paginação via query `page`/`limit` e filtros adicionais (repassados diretamente ao Prisma).

**Resposta 200 (shape)**
```json
{
  "data": [
    {
      "id": "cart_...",
      "order": { "orderNumber": "ML-...", "status": "PENDING" },
      "totalItems": 2,
      "status": "CHECKED_OUT",
      "cartItems": [],
      "user": { "id": "...", "email": "...", "role": "CLIENT" }
    }
  ],
  "currentPage": 1,
  "lastPage": 1,
  "total": 1
}
```

### `GET /orders/:id` (ADMIN)
Detalhe de um pedido/carrinho.

### `PATCH /orders/:id` (ADMIN)
Atualiza campos do pedido (body é repassado ao Prisma).

### `POST /orders/:id/cancel` (ADMIN)
Cancela pedido (status → `CANCELLED`).

---

## Pagamentos (`/payments`) — protegido

### Header de idempotência (recomendado)
Para evitar pagamentos duplicados em retries, envie:
- `Idempotency-Key: {{uuid}}`

> No backend, o header é lido como `idempotency-key`.

### `POST /payments/pix`
Cria tentativa de pagamento PIX para um `orderId`.

**Body**
```json
{
  "orderId": "order_...",
  "payer": {
    "email": "cliente@exemplo.com",
    "name": "Nome do Cliente",
    "cpf": "00000000000"
  }
}
```

### `POST /payments/card`
Cria pagamento com cartão para um `orderId`.

**Body**
```json
{
  "orderId": "order_...",
  "cardToken": "tok_...",
  "paymentMethodId": "master",
  "issuerId": "123",
  "installments": 1,
  "payer": {
    "email": "cliente@exemplo.com",
    "name": "Nome do Cliente",
    "cpf": "00000000000"
  }
}
```

### `GET /payments/:orderId/status`
Consulta status de pagamento do pedido.

---

## Webhooks (`/webhooks`)

### `POST /webhooks/mercadopago`
Webhook do Mercado Pago (usado para atualizar `paymentStatus` do pedido e registrar tentativas).

**Assinatura (opcional, recomendado em produção)**
Se `MERCADOPAGO_WEBHOOK_SECRET` estiver configurado, o backend valida:
- Header `x-signature` (formato com `ts=` e `v1=`)
- Header `x-request-id`
- `data.id` (via query `?data.id=...` ou no body)

**Resposta**
Sempre retorna `200` com:
```json
{ "received": true }
```

---

## Usuários (`/users`) — ADMIN

### `GET /users/employees`
Lista colaboradores/funcionários (retorno depende do service).

### `GET /users/:id`
Busca usuário por id.

### `PUT /users/:id`
Atualiza usuário (mesmas regras de `CreateUserDto`, mas tudo opcional).

### `POST /users`
Cria usuário (admin).

---

## Endereços (`/addresses`) — protegido

### `POST /addresses`
Cria um endereço do usuário.

**Body**
```json
{
  "label": "Casa",
  "street": "Rua Exemplo",
  "number": "123",
  "city": "São Paulo",
  "district": "Centro",
  "zipCode": "01000-000",
  "complement": "Apto 12",
  "country": "Brasil",
  "state": "SP",
  "isDefault": true
}
```

### `GET /addresses`
Lista endereços do usuário.

### `PATCH /addresses/:id`
Atualiza endereço.

### `PATCH /addresses/:id/set-default`
Define endereço como padrão.

---

## Fluxos recomendados (Front-end)

### Fluxo de autenticação
- `POST /auth/login` (salva cookies)
- Em todas as chamadas: enviar credenciais (`include`)
- Se `401`: chamar `POST /auth/refresh` e repetir a requisição original
- Para encerrar: `POST /auth/logout`

### Fluxo de compra (checkout + pagamento)
- (1) Montar carrinho:
  - `POST /carts/items`
  - `GET /carts`
- (2) Cotar frete:
  - `GET /carts/shipping-quote?zipCode=...`
- (3) Checkout:
  - `POST /orders/checkout` com `addressId` e `shippingServiceId`
  - Guardar `orderId` e dados de `payer`
- (4) Pagamento:
  - PIX: `POST /payments/pix`
  - Cartão: `POST /payments/card`
  - Incluir `Idempotency-Key`
- (5) Atualização de status:
  - Poll `GET /payments/:orderId/status` (se necessário)
  - Webhook `/webhooks/mercadopago` atualiza status no backend

---

## Variáveis de ambiente relevantes (integração)

- **`FRONTEND_URL`**: origin liberado no CORS
- **`JWT_SECRET`**: assinatura do JWT
- **`MERCADOPAGO_WEBHOOK_SECRET`**: validação do webhook (recomendado)
- **`MELHOR_ENVIO_API_URL`**, **`MELHOR_ENVIO_TOKEN`**, **`MELHOR_ENVIO_FROM_ZIPCODE`**: frete (Melhor Envio)

