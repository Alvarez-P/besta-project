# Besta Project

API REST serverless construida con **AWS CDK**, **Express.js** y **MySQL**, siguiendo Domain-Driven Design (DDD) y Clean Architecture. Desplegable en AWS Lambda a través de API Gateway.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 20.x (Lambda) |
| Framework | Express.js vía `@vendia/serverless-express` |
| ORM | Sequelize 6 + MySQL 8.0 |
| Infraestructura | AWS CDK v2 (TypeScript) |
| Base de datos | Amazon RDS MySQL (VPC) |
| Autenticación | JWT (HMAC-SHA256, `node:crypto`) |
| Validación | Zod |
| Documentación | OpenAPI 3.0 + Swagger UI |
| Herramientas | Biome, Husky, lint-staged |

## Arquitectura

```
API Gateway (REST, proxy)
└── Lambda (Express + serverless-express)
    ├── POST   /auth/login       (público)
    ├── POST   /users            (público)
    ├── GET    /users            (autenticado)
    ├── GET    /users/:id        (autenticado)
    ├── PUT    /users/:id        (autenticado)
    ├── DELETE /users/:id        (autenticado)
    ├── GET    /health           (público)
    └── GET    /api-docs         (público, Swagger UI)
```

```
src/
├── context/
│   ├── auth/       # Login y generación de JWT
│   ├── user/       # CRUD (aggregate, VO, domain service, casos de uso)
│   └── health/     # Health check
├── shared/
│   ├── infrastructure/
│   │   ├── crypto/        # PasswordService, JwtService
│   │   ├── database/      # Inicialización de Sequelize, BaseRepository, UnitOfWork
│   │   ├── errors/        # BaseError + clases de error HTTP
│   │   ├── mail/          # Adaptador SES + notificaciones
│   │   ├── middleware/     # validate (Zod), error-handler, auth-guard
│   │   ├── swagger/       # Definición OpenAPI 3.0
│   │   └── response.ts    # Helpers de respuesta (success, paginated)
│   └── domain/
│       └── repository.interface.ts
├── index.ts        # Handler de Lambda
└── server.ts       # Fábrica de la aplicación Express
```

## Requisitos Previos

- **Node.js 20** (`nvm use` cambia automáticamente vía `.nvmrc`)
- **AWS CLI** configurado (`aws configure`)
- **AWS CDK** bootstrapped en tu cuenta/región (`cdk bootstrap`)
- **Git 2.32+** (para los hooks de lint-staged)

## Configuración Inicial

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd besta-project
npm install

# 2. Usar la versión de Node del proyecto
nvm use

# 3. Configurar credenciales de AWS
aws configure
```

## Variables de Entorno

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `DB_NAME` | CDK stack | Nombre de la base de datos (`besta`) |
| `DB_SECRET_ARN` | CDK stack | ARN del secreto en Secrets Manager con credenciales RDS |
| `SES_FROM_EMAIL` | CDK stack | Email verificado en SES para envío de correos |
| `NODE_ENV` | CDK context | `dev`, `qa`, `prod` |

El **secreto JWT** se almacena en el mismo secreto de Secrets Manager que las credenciales de RDS (campo `jwtSecret`).

## Despliegue

```bash
# Despliegue manual (especificar entorno vía contexto)
npm run cdk -- deploy --context environment=dev

# O usando los scripts npm
npm run deploy -- --context environment=dev

# CI/CD: hacer push a la rama qa dispara el despliegue automático
# (ver .github/workflows/deploy-qa.yml)
```

Antes del primer despliegue, ejecuta el bootstrap de CDK en tu cuenta:

```bash
cdk bootstrap aws://<account-id>/<region>
```

## Endpoints de la API

Consulta `endpoints.http` para ejemplos completos de cada request.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/health` | No | Estado de la API y base de datos |
| `POST` | `/auth/login` | No | Inicio de sesión, devuelve JWT |
| `POST` | `/users` | No | Registrar usuario |
| `GET` | `/users` | Sí | Listar usuarios (paginado, filtrable) |
| `GET` | `/users/:id` | Sí | Obtener usuario por ID |
| `PUT` | `/users/:id` | Sí | Actualizar usuario |
| `DELETE` | `/users/:id` | Sí | Eliminar usuario |
| `GET` | `/api-docs` | No | Swagger UI interactivo |
| `GET` | `/api-docs.json` | No | Especificación OpenAPI (JSON) |

### Formato de Respuesta

**Éxito:**

```json
{ "success": true, "data": { ... } }
```

**Paginado:**

```json
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 42 } }
```

**Error:**

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Recurso no encontrado" } }
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run typecheck` | Verificar tipos de TypeScript (ambos tsconfigs) |
| `npm run format` | Formatear código con Biome |
| `npm run check` | Formatear + lint + organizar imports |
| `npm run lint` | Solo lint, sin escribir cambios |
| `npm run synth` | Sintetizar stack de CDK |
| `npm run deploy` | Desplegar stack de CDK |
| `npm run destroy` | Destruir stack de CDK |

## Formato del Secreto en Secrets Manager

El secreto de RDS generado por CDK debe extenderse con el campo `jwtSecret`:

```json
{
  "username": "admin",
  "password": "...",
  "host": "...",
  "port": 3306,
  "jwtSecret": "clave-secreta-jwt-de-256-bits"
}
```

> El campo `jwtSecret` es usado por el JwtService en tiempo de ejecución para firmar y verificar tokens.
