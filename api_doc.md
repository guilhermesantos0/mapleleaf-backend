# Documentação das Rotas da API

> Base URL: `VITE_APP_API_URL` (configurada via variável de ambiente)  
> Autenticação: Bearer Token (header `Authorization: Bearer <token>`)

---

## Sumário

- [Pedidos — Admin](#pedidos--admin)
  - [GET /admin/carts](#get-admincarts)
  - [GET /admin/carts/:id](#get-admincartsid)
  - [PUT /admin/carts/:id/cancelado](#put-admincartsidcancelado)
  - [PUT /admin/carts/:id](#put-admincartsid)
- [Pedidos — Usuário](#pedidos--usuário)
  - [GET /carts/index](#get-cartsindex)
- [Carrinho](#carrinho)
  - [GET /carts](#get-carts)
  - [POST /carts/add-product](#post-cartsadd-product)
  - [POST /carts/remove-product](#post-cartsremove-product)
  - [POST /carts/:id/address](#post-cartsidaddress)
- [Produtos](#produtos)
  - [GET /products](#get-products)
  - [GET /products/:id](#get-productsid)
  - [POST /admin/products](#post-adminproducts)
  - [POST /admin/products/:id/update-data](#post-adminproductsidupdate-data)
- [Usuários — Admin](#usuários--admin)
  - [GET /admin/users](#get-adminusers)
  - [GET /admin/users/:id](#get-adminusersid)
  - [PUT /admin/users/:id](#put-adminusersid)
  - [POST /admin/users](#post-adminusers)
- [Usuários — Autenticado](#usuários--autenticado)
  - [GET /user](#get-user)
  - [POST /user-addresses](#post-user-addresses)
  - [POST /email/resend](#post-emailresend)
- [Autenticação](#autenticação)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/logout](#post-authlogout)
- [Frete](#frete)
  - [POST /carts/:id/shipping/quote](#post-cartsidshippingquote)
  - [POST /carts/:id/shipping/select](#post-cartsidshippingselect)

---

## Pedidos — Admin

### GET /admin/carts

Lista todos os pedidos com suporte a filtros e paginação.

**Função:** `getAdminOrders(token, filters)`

**Autenticação:** Requerida

**Query Parameters:**

| Parâmetro       | Tipo            | Obrigatório | Descrição                          |
|----------------|-----------------|-------------|------------------------------------|
| `page`          | `number`        | Sim         | Número da página                   |
| `customer_name` | `string`        | Não         | Filtrar pelo nome do cliente       |
| `status`        | `number`        | Não         | Filtrar pelo status do pedido      |
| `start_date`    | `string`        | Não         | Data de início do intervalo (ISO)  |
| `end_date`      | `string`        | Não         | Data de fim do intervalo (ISO)     |

**Resposta de Sucesso:** `200 OK`

```json
{
  "current_page": 1,
  "last_page": 5,
  "total": 48,
  "data": [
    {
      "id": 1,
      "status_name": "Aguardando pagamento",
      "created_at": "2024-01-15T10:00:00Z",
      "amount_cart": 2,
      "total_amount": 350.00,
      "shipping_price": "25.00",
      "shipping_tracking": null,
      "user": {
        "id": 10,
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "11999999999"
      },
      "address": { ... },
      "payment": null,
      "product_cart": [ ... ]
    }
  ]
}
```

---

### GET /admin/carts/:id

Retorna os detalhes de um pedido específico.

**Função:** `getAdminOrder(token, orderId)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição          |
|-----------|----------|--------------------|
| `id`      | `number` | ID do pedido       |

**Resposta de Sucesso:** `200 OK`

```json
{
  "id": 1,
  "status_name": "Enviado",
  "created_at": "2024-01-15T10:00:00Z",
  "amount_cart": 2,
  "total_amount": 350.00,
  "shipping_price": "25.00",
  "shipping_tracking": "BR123456789",
  "user": {
    "id": 10,
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999"
  },
  "address": {
    "label": "Casa",
    "street": "Rua das Flores",
    "number": "123",
    "city": "São Paulo",
    "state": "SP",
    "postal_code": "01310-100",
    "country": "BR"
  },
  "payment": {
    "paid_at": "2024-01-15T12:00:00Z",
    "payment_method_label": "Cartão de Crédito"
  },
  "product_cart": [ ... ]
}
```

---

### PUT /admin/carts/:id/cancelado

Cancela um pedido existente.

**Função:** `cancelOrder(token, cartId)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição    |
|-----------|----------|--------------|
| `id`      | `number` | ID do pedido |

**Body:** Nenhum

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

### PUT /admin/carts/:id

Atualiza as informações de um pedido (ex: código de rastreio).

**Função:** `updateOrder(token, cartId, body)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição    |
|-----------|----------|--------------|
| `id`      | `number` | ID do pedido |

**Body (JSON):**

| Campo               | Tipo            | Descrição                                  |
|---------------------|-----------------|--------------------------------------------|
| `shipping_tracking` | `string \| null` | Código de rastreamento da entrega         |

```json
{
  "shipping_tracking": "BR123456789"
}
```

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

## Pedidos — Usuário

### GET /carts/index

Lista os pedidos do usuário autenticado com paginação.

**Função:** `getUserOrders(token)`

**Autenticação:** Requerida

**Resposta de Sucesso:** `200 OK`

```json
{
  "current_page": 1,
  "last_page": 2,
  "total": 10,
  "data": [
    {
      "id": 1,
      "status_name": "Entregue",
      "amount_cart": 1,
      "shipping_price": "15.00",
      "created_at": "2024-01-10T08:30:00Z",
      "product_cart": [ ... ]
    }
  ]
}
```

---

## Carrinho

### GET /carts

Retorna os itens do carrinho ativo do usuário autenticado, junto ao valor total.

**Função:** `getUserCart(token)` / `loadProductFromCart(token, setCart)`

**Autenticação:** Requerida

**Resposta de Sucesso:** `200 OK`

```json
{
  "data": [
    {
      "id": 5,
      "cart_id": 2,
      "quantity": 1,
      "product_id": 12,
      "product_option_id": 3,
      "product": {
        "id": 12,
        "name": "Bolsa Couro Premium",
        "default_price": "299.90",
        "size": "M",
        ...
      },
      "product_option": {
        "id": 3,
        "option_name": "Preta",
        "color_hex": "#000000",
        "total_price": 299.90,
        "additional_price": 0,
        "stock_quantity": 10,
        "images": [{ "url": "https://cdn.example.com/img.jpg" }]
      }
    }
  ],
  "total_amount": 299.90
}
```

> `loadProductFromCart` é um wrapper de `getUserCart` que, além de buscar os dados, já mapeia o resultado e atualiza o estado do carrinho via `setCart`.

---

### POST /carts/add-product

Adiciona um produto ao carrinho do usuário autenticado.

**Função:** `addProductToCart(token, payload)`

**Autenticação:** Requerida

**Body (JSON):**

| Campo               | Tipo     | Obrigatório | Descrição                              |
|---------------------|----------|-------------|----------------------------------------|
| `product_id`        | `number` | Sim         | ID do produto a ser adicionado         |
| `product_option_id` | `number` | Sim         | ID da opção do produto (cor, tamanho)  |
| `quantity`          | `number` | Não         | Quantidade desejada (padrão: 1)        |

```json
{
  "product_id": 12,
  "product_option_id": 3,
  "quantity": 2
}
```

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

### POST /carts/remove-product

Remove ou reduz a quantidade de um produto no carrinho.

**Função:** `removeProductFromCart(token, product_id, product_option_id, quantity)`

**Autenticação:** Requerida

**Body (JSON):**

| Campo               | Tipo     | Descrição                               |
|---------------------|----------|-----------------------------------------|
| `product_id`        | `number` | ID do produto                           |
| `product_option_id` | `number` | ID da opção do produto                  |
| `quantity`          | `number` | Quantidade a ser removida               |

```json
{
  "product_id": 12,
  "product_option_id": 3,
  "quantity": 1
}
```

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

### POST /carts/:id/address

Associa um endereço de entrega ao carrinho.

**Função:** `updateCartAddress(token, addressId, cartId)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição      |
|-----------|----------|----------------|
| `id`      | `number` | ID do carrinho |

**Body (JSON):**

| Campo        | Tipo     | Descrição              |
|--------------|----------|------------------------|
| `address_id` | `number` | ID do endereço salvo   |

```json
{
  "address_id": 7
}
```

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

## Produtos

### GET /products

Lista produtos com suporte a paginação e filtro por categoria. Utilizado tanto na listagem pública quanto no painel admin.

**Funções:** `getNewProducts(category?)` / `getProducts(page, category?)` / `getAdminProducts(filters)` / `getDisplayProducts()`

**Autenticação:** Não requerida

**Query Parameters:**

| Parâmetro | Tipo                              | Obrigatório | Descrição                                   |
|-----------|-----------------------------------|-------------|---------------------------------------------|
| `page`    | `number`                          | Sim         | Número da página                            |
| `category`| `"BOLSA" \| "CARTEIRA" \| "MOCHILA"` | Não      | Filtrar por categoria                       |
| `name`    | `string`                          | Não         | Filtrar por nome (admin)                    |
| `date`    | `string`                          | Não         | Filtrar por data de lançamento (admin)      |
| `size`    | `string`                          | Não         | Filtrar por tamanho (admin)                 |

> **Observações sobre as funções:**
> - `getNewProducts` busca sempre a página 1 e retorna diretamente o array `Product[]` (sem wrapper de paginação).
> - `getProducts` e `getAdminProducts` retornam a resposta paginada completa.
> - `getDisplayProducts` realiza **3 requisições em paralelo** (uma por categoria) e retorna todos os produtos concatenados em um único array.

**Resposta de Sucesso:** `200 OK`

```json
{
  "current_page": 1,
  "last_page": 3,
  "total": 24,
  "data": [
    {
      "id": 12,
      "code": "BOL-001",
      "name": "Bolsa Couro Premium",
      "description": "Bolsa de couro legítimo.",
      "category": "BOLSA",
      "size": "M",
      "destaque": true,
      "release_date": "2024-01-01",
      "default_price": "299.90",
      "default_weight": "0.8",
      "default_box_length": "30",
      "default_box_width": "10",
      "default_box_height": "20",
      "average_rating": 4.5,
      "ratings_count": 12,
      "options": [ ... ],
      "ratings": [ ... ]
    }
  ]
}
```

---

### GET /products/:id

Retorna os detalhes de um produto específico.

**Função:** `getProductById(productId)`

**Autenticação:** Não requerida

**Path Parameters:**

| Parâmetro   | Tipo               | Descrição      |
|-------------|--------------------|----------------|
| `id`        | `string \| number` | ID do produto  |

**Resposta de Sucesso:** `200 OK`

```json
{
  "id": 12,
  "code": "BOL-001",
  "name": "Bolsa Couro Premium",
  "description": "Bolsa de couro legítimo.",
  "category": "BOLSA",
  "size": "M",
  "destaque": true,
  "release_date": "2024-01-01",
  "default_price": "299.90",
  "default_weight": "0.8",
  "default_box_length": "30",
  "default_box_width": "10",
  "default_box_height": "20",
  "average_rating": 4.5,
  "ratings_count": 12,
  "options": [
    {
      "id": 3,
      "option_name": "Preta",
      "color_hex": "#000000",
      "additional_price": 0,
      "total_price": 299.90,
      "stock_quantity": 10,
      "images": [{ "url": "https://cdn.example.com/img.jpg" }]
    }
  ],
  "ratings": [
    {
      "id": 1,
      "user_id": 5,
      "rating": 5,
      "review_text": "Produto excelente!",
      "created_at": "2024-02-10T14:00:00Z"
    }
  ]
}
```

---

### POST /admin/products

Cria um novo produto. O corpo da requisição é enviado como `multipart/form-data` para suportar o upload de imagens das opções.

**Função:** `createNewProduct(token, body)`

**Autenticação:** Requerida

**Content-Type:** `multipart/form-data`

**Campos do formulário:**

| Campo                              | Tipo      | Descrição                                      |
|------------------------------------|-----------|------------------------------------------------|
| `name`                             | `string`  | Nome do produto                                |
| `code`                             | `string`  | Código interno do produto                      |
| `description`                      | `string`  | Descrição do produto                           |
| `category`                         | `string`  | Categoria (`BOLSA`, `CARTEIRA`, `MOCHILA`)     |
| `size`                             | `string`  | Tamanho (`P`, `M`, `G`)                        |
| `default_price`                    | `number`  | Preço base                                     |
| `default_weight`                   | `number`  | Peso padrão (kg)                               |
| `default_box_length`               | `number`  | Comprimento da caixa (cm)                      |
| `default_box_width`                | `number`  | Largura da caixa (cm)                          |
| `default_box_height`               | `number`  | Altura da caixa (cm)                           |
| `release_date`                     | `string`  | Data de lançamento (ISO)                       |
| `destaque`                         | `0 \| 1`  | Produto em destaque (`1` = sim, `0` = não)     |
| `options[N][option_name]`          | `string`  | Nome da opção (ex: "Preta")                    |
| `options[N][color_hex]`            | `string`  | Cor em hexadecimal (ex: "#000000")             |
| `options[N][stock_quantity]`       | `number`  | Quantidade em estoque                          |
| `options[N][images][]`             | `File`    | Arquivos de imagem da opção                    |

> `N` representa o índice da opção (0, 1, 2...). O campo `id` da opção não é enviado na criação.

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

### POST /admin/products/:id/update-data

Atualiza os dados de um produto existente. Assim como na criação, o corpo é enviado como `multipart/form-data`.

**Função:** `updateProduct(productId, token, body)`

**Autenticação:** Requerida

**Content-Type:** `multipart/form-data`

**Path Parameters:**

| Parâmetro | Tipo     | Descrição      |
|-----------|----------|----------------|
| `id`      | `number` | ID do produto  |

**Campos do formulário:** Mesmos campos de [POST /admin/products](#post-adminproducts), com a adição de:

| Campo               | Tipo     | Descrição                                              |
|---------------------|----------|--------------------------------------------------------|
| `options[N][id]`    | `number` | ID da opção existente (quando for atualização de opção já cadastrada) |

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

## Usuários — Admin

### GET /admin/users

Lista todos os usuários com suporte a filtros. Retorna os dados normalizados (sem o wrapper `admin_data`).

**Função:** `getUsers(token, filters)`

**Autenticação:** Requerida

**Query Parameters:**

| Parâmetro | Tipo     | Obrigatório | Descrição                                       |
|-----------|----------|-------------|-------------------------------------------------|
| `name`    | `string` | Não         | Filtrar pelo nome do usuário                    |
| `role`    | `string` | Não         | Filtrar por papel (`ADMIN`, `FUNCIONARIO`)      |

**Resposta de Sucesso:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "role": "FUNCIONARIO"
  }
]
```

> A resposta da API inclui o campo `admin_data.role` aninhado, que é normalizado pela função para o campo `role` diretamente no objeto do usuário.

---

### GET /admin/users/:id

Retorna os detalhes de um usuário específico.

**Função:** `getUserById(token, id)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição       |
|-----------|----------|-----------------|
| `id`      | `number` | ID do usuário   |

**Resposta de Sucesso:** `200 OK`

```json
{
  "id": 1,
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "role": "FUNCIONARIO"
}
```

---

### PUT /admin/users/:id

Atualiza os dados de um usuário existente.

**Função:** `updateUser(token, id, user)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição     |
|-----------|----------|---------------|
| `id`      | `number` | ID do usuário |

**Body (JSON):**

| Campo   | Tipo                              | Descrição                               |
|---------|-----------------------------------|-----------------------------------------|
| `name`  | `string`                          | Nome do usuário                         |
| `email` | `string`                          | E-mail do usuário                       |
| `phone` | `string`                          | Telefone do usuário                     |
| `role`  | `"ADMIN" \| "FUNCIONARIO" \| null` | Papel do usuário                       |

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "role": "FUNCIONARIO"
}
```

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

### POST /admin/users

Cria um novo usuário pelo painel administrativo.

**Função:** `createNewUser(token, user)`

**Autenticação:** Requerida

**Body (JSON):**

| Campo      | Tipo     | Descrição              |
|------------|----------|------------------------|
| `name`     | `string` | Nome do usuário        |
| `email`    | `string` | E-mail do usuário      |
| `phone`    | `string` | Telefone do usuário    |
| `password` | `string` | Senha do usuário       |
| `role`     | `string` | Papel (`ADMIN`, `FUNCIONARIO`) |

```json
{
  "name": "Maria Souza",
  "email": "maria@email.com",
  "phone": "11988888888",
  "password": "senha123",
  "role": "FUNCIONARIO"
}
```

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

## Usuários — Autenticado

### GET /user

Retorna os dados do usuário autenticado, incluindo seu papel.

**Função:** `getUserDetails(token)`

**Autenticação:** Requerida

**Resposta de Sucesso:** `200 OK`

```json
{
  "id": 1,
  "name": "João Silva",
  "email": "joao@email.com",
  "email_verified_at": "2024-01-10T08:00:00Z",
  "phone": "11999999999",
  "role": "FUNCIONARIO"
}
```

> O campo `email_verified_at` pode ser `null` caso o usuário ainda não tenha verificado o e-mail.

---

### POST /user-addresses

Cadastra um novo endereço para o usuário autenticado.

**Função:** `setUserAddress(token, body)`

**Autenticação:** Requerida

**Body (JSON):**

| Campo         | Tipo     | Obrigatório | Descrição                          |
|---------------|----------|-------------|------------------------------------|
| `label`       | `string` | Sim         | Identificador do endereço (ex: "Casa") |
| `street`      | `string` | Sim         | Logradouro                         |
| `number`      | `string` | Sim         | Número                             |
| `city`        | `string` | Sim         | Cidade                             |
| `state`       | `string` | Sim         | Estado (sigla)                     |
| `postal_code` | `string` | Sim         | CEP                                |
| `country`     | `string` | Sim         | País (ex: "BR")                    |
| `complement`  | `string` | Não         | Complemento                        |

```json
{
  "label": "Casa",
  "street": "Rua das Flores",
  "number": "123",
  "city": "São Paulo",
  "state": "SP",
  "postal_code": "01310-100",
  "country": "BR",
  "complement": "Apto 42"
}
```

**Resposta de Sucesso:** `200 OK`

```json
{
  "id": 7,
  "label": "Casa",
  "street": "Rua das Flores",
  "number": "123",
  "city": "São Paulo",
  "state": "SP",
  "postal_code": "01310-100",
  "country": "BR",
  "complement": "Apto 42",
  "user_id": 1,
  "created_at": "2024-03-01T10:00:00Z",
  "updated_at": "2024-03-01T10:00:00Z"
}
```

---

### POST /email/resend

Reenvia o e-mail de verificação para o usuário autenticado.

**Função:** `resendEmailVerification(token)`

**Autenticação:** Requerida

**Body:** Nenhum

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

## Autenticação

### POST /auth/login

Autentica um usuário e retorna o token de acesso.

**Função:** `postUserLogin(user)`

**Autenticação:** Não requerida

**Body (JSON):**

| Campo      | Tipo     | Descrição          |
|------------|----------|--------------------|
| `email`    | `string` | E-mail do usuário  |
| `password` | `string` | Senha do usuário   |

```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Resposta de Sucesso:** `200 OK`

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGci...",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "google_id": null,
    "role": "FUNCIONARIO"
  }
}
```

---

### POST /auth/register

Registra um novo usuário e retorna o token de acesso.

**Função:** `postUserRegistration(user)`

**Autenticação:** Não requerida

**Body (JSON):**

| Campo      | Tipo     | Descrição           |
|------------|----------|---------------------|
| `name`     | `string` | Nome do usuário     |
| `email`    | `string` | E-mail do usuário   |
| `phone`    | `string` | Telefone do usuário |
| `password` | `string` | Senha do usuário    |

```json
{
  "name": "Maria Souza",
  "email": "maria@email.com",
  "phone": "11988888888",
  "password": "senha123"
}
```

**Resposta de Sucesso:** `200 OK`

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGci...",
  "user": {
    "id": 2,
    "name": "Maria Souza",
    "email": "maria@email.com",
    "google_id": null,
    "role": null
  }
}
```

---

### POST /auth/logout

Encerra a sessão do usuário autenticado, invalidando o token.

**Função:** `postUserLogout(token)`

**Autenticação:** Requerida

**Body:** Nenhum

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

## Frete

### POST /carts/:id/shipping/quote

Solicita as opções de frete disponíveis para o carrinho.

**Função:** `getCartQuote(token, cartId)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição      |
|-----------|----------|----------------|
| `id`      | `number` | ID do carrinho |

**Body:** Nenhum

**Resposta de Sucesso:** `200 OK`

```json
{
  "quotes": [
    {
      "id": 1,
      "name": "PAC",
      "price": "18.50",
      "delivery_time": 7,
      "currency": "BRL"
    },
    {
      "id": 2,
      "name": "SEDEX",
      "price": "35.00",
      "delivery_time": 2,
      "currency": "BRL"
    }
  ]
}
```

---

### POST /carts/:id/shipping/select

Seleciona uma opção de frete para o carrinho.

**Função:** `setCartQuote(token, body, cartId)`

**Autenticação:** Requerida

**Path Parameters:**

| Parâmetro | Tipo     | Descrição      |
|-----------|----------|----------------|
| `id`      | `number` | ID do carrinho |

**Body (JSON):**

| Campo        | Tipo     | Descrição                              |
|--------------|----------|----------------------------------------|
| `service_id` | `number` | ID do serviço de frete selecionado     |
| `price`      | `number` | Preço do frete selecionado             |

```json
{
  "service_id": 1,
  "price": 18.50
}
```

**Resposta de Sucesso:** `200 OK`

```json
null
```

---

## Tratamento de Erros

Todas as funções retornam um objeto `ApiResponse<T>` padronizado:

```typescript
// Sucesso
{ status: 200, data: T }

// Erro da API
{ status: 400 | 401 | 404 | 422 | 500, error: { message: string } }

// Erro de rede
{ status: 500, error: { message: "Ocorreu um erro inesperado na comunicação!" } }
```

| Status | Significado                        |
|--------|------------------------------------|
| `200`  | Sucesso                            |
| `401`  | Não autenticado / token inválido   |
| `403`  | Sem permissão de acesso            |
| `404`  | Recurso não encontrado             |
| `422`  | Erro de validação dos dados        |
| `500`  | Erro interno do servidor           |