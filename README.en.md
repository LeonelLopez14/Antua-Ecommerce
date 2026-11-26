# Antojarte

[Versión en español](README.md)

An online shop for homemade cookies, built end to end as a practice project:
- catalog with filters;
- cart for guests and signed-in customers;
- four-step checkout;
- Mercado Pago payments (simulated for now);
- order emails;
- admin panel with an audit log and CSV export;
- deployment with Docker, Caddy and HTTPS.

The interface is in Spanish (Uruguay).

> **Practice project.** The "Antojarte" brand, the products, prices and reviews are examples. It is not a real shop and it does not charge anything.

| | |
|---|---|
| ![Home with the 3D cookie](Antua/antua-web/docs/media/home.jpg) | ![Shop with filters](Antua/antua-web/docs/media/tienda.jpg) |
| **Home.** A 3D cookie (Three.js) over a still image that loads instantly | **Shop.** Category and price filters, kept in the URL |
| ![Product page](Antua/antua-web/docs/media/ficha.jpg) | ![Cart](Antua/antua-web/docs/media/carrito.jpg) |
| **Product page.** x1/x6/x12 variants, allergens and reviews | **Cart.** Side drawer with coupons; the server computes every amount |
| ![Checkout](Antua/antua-web/docs/media/checkout.jpg) | ![Admin panel](Antua/antua-web/docs/media/panel.jpg) |
| **Checkout.** Four steps, with or without an account | **Admin panel.** Orders, catalog, coupons, reviews and audit log |
| ![Dark mode](Antua/antua-web/docs/media/oscuro.jpg) | |
| **Dark mode.** Its own palette, AA contrast | |

Screenshots of the real app with the demo data (`pnpm seed:demo`), at 1280 px.

## Stack

| Part | Technology |
|---|---|
| Front end | React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand, React Router, GSAP, Three.js (React Three Fiber) |
| API | NestJS 11, TypeORM 1, MySQL 8.4, Passport JWT, class-validator, Nodemailer |
| Payments | Mercado Pago Checkout Pro (test mode; simulated for now) |
| Infrastructure | Docker Compose, Caddy (HTTPS, CSP and static files), GitHub Actions, Dependabot |
| Tests | Jest and Supertest (API), Vitest and Testing Library (front end), Playwright with axe-core (end-to-end and accessibility), Lighthouse |

## Architecture

```mermaid
flowchart LR
  B["Browser"] -->|HTTPS| C["Caddy<br/>CSP, headers, compression"]
  C -->|"/ (static)"| W["React front end<br/>built with Vite"]
  C -->|"/api"| A["NestJS API<br/>non-root user"]
  A -->|"user without schema privileges"| D[("MySQL 8.4<br/>internal network")]
  A --> U[("Image volume")]
  A -->|SMTP| M["Email"]
  A <-->|"Checkout Pro and signed webhook"| MP["Mercado Pago"]
  R["backup-db.sh<br/>daily backup"] --> D
```

- **Amounts:** the front end never computes a total. The API recomputes prices, coupons and shipping at every step and takes stock with a row lock.
- **Production:** the database publishes no ports and the API does not run as root. Details in [despliegue.md](Antua/antua-web/docs/despliegue.md) (Spanish).
- **Technical decisions:** the reasons for each one are in [decisiones.md](Antua/antua-web/docs/decisiones.md) (Spanish).

## Run it locally

Requirements: **Node.js 24**, **pnpm 10** (`npm i -g pnpm@10`) and **Docker**.

```bash
git clone <this-repo-url> antojarte
cd antojarte/Antua
pnpm install

# Local configuration. The examples already work together; for anything beyond a quick try,
# change DB_PASSWORD (the same in both .env files) and JWT_SECRET.
cp .env.example .env
cp antua-api/.env.example antua-api/.env
cp antua-web/.env.example antua-web/.env

docker compose up -d db                      # MySQL on 127.0.0.1:3307
pnpm --filter antua-api migration:run        # creates the tables (the API never migrates by itself)
DEMO_PASSWORD='Demo2026!' pnpm seed:demo     # demo catalog, reviews, coupon and account
pnpm dev                                     # shop: http://localhost:5173 · API: http://localhost:3000
```

In PowerShell, the seed line is `$env:DEMO_PASSWORD='Demo2026!'; pnpm seed:demo`.

Then:
- **Demo account:** sign in as `demo.cliente@antojarte.example` with the password you chose.
- **Sample coupon:** `DEMO10`.
- **Payments:** simulated.
- **Admin panel:** add `DEMO_ADMIN_PASSWORD='…'` to the seed command and open `/admin` as `demo.admin@antojarte.example`.
- **Remove the demo data:** `pnpm seed:demo:clean --yes`.

Variations:
- **Other ports:** `MYSQL_PORT` in `.env`; `DB_PORT` and `PORT` in `antua-api/.env`; `VITE_API_URL` in `antua-web/.env`; and `pnpm dev:web --port 5180`.
- **Everything in Docker:** `docker compose --profile web up -d --build`.
- **Emails in the browser** (Mailpit), **a real admin** and **the development test data:** see [Antua/README.md](Antua/README.md) (Spanish).

## Tests

```bash
cd Antua
pnpm --filter antua-api test          # API, unit
pnpm --filter antua-api test:e2e      # API, end-to-end (needs an empty antua_test database; see Antua/README.md)
pnpm --filter antua-web test          # front end, unit
pnpm --filter antua-web test:e2e      # Playwright flows (needs the API with data)
```

At the end of Phase 16:
- **API:** 136 unit tests and 160 end-to-end tests.
- **Front end:** 61 unit tests, plus the Playwright suites.
- **CI:** continuous integration runs all of this on every pull request, plus lint, type checks, builds and Docker images.

## Quality

| Measurement | Result |
|---|---|
| Lighthouse mobile, performance (median of 3, through the proxy) | Home 96 · Shop 97 · Product 97 |
| Lighthouse desktop, performance | Home 100 · Shop 100 |
| Lighthouse: accessibility, best practices and SEO | 100 on every measured page |
| axe-core | 0 violations in 150 scans: 375 and 1280 px, light and dark, checkout and admin panel |
| Keyboard | 34 of 34 automated walkthroughs |
| Contrast | AA for every palette pair; control borders at 3:1 or more |

Details and method in the [QA report](Antua/antua-web/docs/qa/informe-qa.md) (Spanish).

## Security

The Phase 16 review backs every claim with evidence (a test, a request or a tool's output). It is in [seguridad.md](Antua/antua-web/docs/seguridad.md) (Spanish). In short:

- **Authorization:** an IDOR matrix tests every route that takes an id (someone else → 404, signed out → 401) and fails if a new route has no test. Responses are checked against an allowlist of fields.
- **Sessions:** HS256 JWTs that expire and are invalidated by a password change. The role is read from the database on every request. Login does not reveal whether an email exists, and spoofed headers do not bypass the rate limit.
- **Inputs:** allowlists for sorting and filters, undeclared fields are rejected, uploads are validated by content (no SVG), and stored HTML is always rendered as text.
- **Production:** CSP without `unsafe-*`, non-root API, database without published ports, an application user without schema privileges, and errors without internal details.
- **Dependencies:** no advisories in production code. New versions are accepted only after 7 days, and a scan of the Git history found no secrets.
- **Pending decisions:** keeping the token in an `httpOnly` cookie, revoking sessions on sign-out, enabling Dependabot alerts and running Caddy as non-root. See "Resumen de hallazgos" (findings summary).

## Known limitations

- **Simulated payments.** The Mercado Pago Checkout Pro integration is built and tested with simulated signatures, but there are no credentials: no payment is real. It only accepts test credentials ([how to try it](Antua/antua-web/docs/mercadopago-prueba.md), Spanish).
- **Example brand and copy.** "Antojarte" is fictional. The contact address (`contacto@antojarte.example`) does not exist, and the legal pages have not been reviewed by a lawyer.
- **No SSR.** It is a single-page app: search engines get `sitemap.xml`, `robots.txt` and structured data, but the content is rendered in the browser.
- **No email verification.** Accounts do not confirm their email. That is why a guest order is never linked by email, only with its token, and why sign-up says when an email is already registered (see seguridad.md).
- **The session token lives in `localStorage`.** The mitigations are tested; the cookie alternative is documented and pending a decision.
- **One language and one currency:** Spanish (Uruguay) and Uruguayan pesos.
- **Real-phone measurement:** the 3D scene has not been measured on a phone with a GPU (Lighthouse has none).

## Data model

Generated from the TypeORM entities with `pnpm --filter antua-api docs:er` (not drawn by hand).

<!-- er:start -->
```mermaid
erDiagram
  addresses {
    int id PK
    varchar label
    varchar street
    varchar city
    varchar postal_code
    varchar country
    boolean is_default
    int userId FK
  }
  admin_audit_log {
    int id PK
    varchar action
    varchar entity
    int entity_id
    json changes
    datetime created_at
    int admin_id FK
  }
  cart_items {
    int id PK
    int quantity
    decimal unit_price_snapshot
    int cartId FK
    int variantId FK
  }
  carts {
    int id PK
    varchar guest_token UK
    int userId FK,UK
    int couponId FK
  }
  coupons {
    int id PK
    varchar code UK
    varchar discount_type
    decimal discount_value
    decimal min_order_amount
    int usage_limit
    timestamp valid_until
    timestamp valid_from
    int times_used
    boolean is_active
  }
  newsletter_subscribers {
    int id PK
    varchar email UK
    datetime created_at
  }
  order_items {
    int id PK
    varchar product_name_snapshot
    decimal unit_price_snapshot
    int quantity
    int orderId FK
    int variantId FK
  }
  order_status_history {
    int id PK
    varchar from_status
    varchar to_status
    datetime created_at
    int order_id FK
    int changed_by_id FK
  }
  orders {
    int id PK
    varchar guest_email
    char guest_access_token_hash
    enum status
    varchar payment_status
    datetime payment_expires_at
    varchar shipping_full_name
    varchar shipping_phone
    varchar shipping_street
    varchar shipping_city
    varchar shipping_postal_code
    decimal subtotal
    decimal discount_amount
    decimal shipping_amount
    int shipping_eta_days
    decimal total
    text internal_note
    datetime created_at
    int userId FK
    int couponId FK
  }
  password_reset_tokens {
    int id PK
    char token_hash UK
    datetime expires_at
    datetime used_at
    datetime created_at
    int userId FK
  }
  payments {
    int id PK
    varchar method
    varchar transaction_ref UK
    decimal amount
    varchar currency
    datetime created_at
    datetime paid_at
    varchar status
    int order_id FK
  }
  product_images {
    int id PK
    varchar url
    int sort_order
    boolean is_primary
    varchar file_name
    int productId FK
  }
  product_tags {
    int id PK
    int product_id FK,UK
    int tag_id FK,UK
  }
  product_variants {
    int id PK
    varchar name
    decimal price
    int stock
    boolean is_active
    varchar sku UK
    int productId FK
  }
  products {
    int id PK
    varchar name
    varchar slug UK
    varchar ingredients
    varchar allergens
    text description
    text nutrition_info
    decimal base_price
    boolean is_active
  }
  reviews {
    int id PK
    text comment
    int rating
    boolean is_hidden
    datetime created_at
    int productId FK,UK
    int userId FK,UK
  }
  tags {
    int id PK
    varchar name
    varchar slug UK
    boolean is_active
  }
  users {
    int id PK
    varchar full_name
    varchar email UK
    varchar password_hash
    varchar phone
    datetime password_changed_at
    enum role
    datetime created_at
  }
  carts |o--o{ cart_items : "cartId"
  coupons |o--o{ carts : "couponId"
  coupons |o--o{ orders : "couponId"
  orders |o--o{ order_items : "orderId"
  orders |o--o{ order_status_history : "order_id"
  orders |o--o{ payments : "order_id"
  product_variants |o--o{ cart_items : "variantId"
  product_variants |o--o{ order_items : "variantId"
  products |o--o{ product_images : "productId"
  products |o--o{ product_tags : "product_id"
  products |o--o{ product_variants : "productId"
  products |o--o{ reviews : "productId"
  tags |o--o{ product_tags : "tag_id"
  users |o--o{ addresses : "userId"
  users |o--o{ admin_audit_log : "admin_id"
  users |o--o{ order_status_history : "changed_by_id"
  users |o--o{ orders : "userId"
  users |o--o{ reviews : "userId"
  users |o--o| carts : "userId"
  users ||--o{ password_reset_tokens : "userId"
```
<!-- er:end -->

## More documentation (Spanish)

| Document | Contents |
|---|---|
| [Antua/README.md](Antua/README.md) | Development guide: commands, migrations, test data, structure |
| [decisiones.md](Antua/antua-web/docs/decisiones.md) | Technical decisions, with the alternatives and the reasons |
| [despliegue.md](Antua/antua-web/docs/despliegue.md) | Production step by step: Docker, HTTPS, backups, logs, health |
| [seguridad.md](Antua/antua-web/docs/seguridad.md) | Security review with evidence |
| [migraciones-pendientes.md](Antua/antua-web/docs/migraciones-pendientes.md) | Proposed migrations, with measured EXPLAIN output |
| [admin.md](Antua/antua-web/docs/admin.md) | Admin panel: roles, endpoints and order statuses |
| [creditos.md](Antua/antua-web/docs/creditos.md) | Licenses of dependencies, fonts, icons and GSAP |

## License

This repository **has no license yet**. Until it has one, you can read the code, but you may not reuse it without permission.
