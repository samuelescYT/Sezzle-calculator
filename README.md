# Full-Stack Calculator

A calculator with a **React + TypeScript + Tailwind CSS** frontend and a **Go** REST microservice backend.
The frontend never does arithmetic itself: every operation is computed by the backend API.

- **Operations:** addition, subtraction, multiplication, division, plus the optional exponentiation, square root and percentage.
- **Frontend:** a classic calculator. The small line shows the pending expression (`60 −`) and the large line shows the number being typed or the result. It supports the keyboard, works on phones, is accessible, and shows errors in the display.
- **Backend:** one standard-library `net/http` service with strict input checking, a consistent JSON error format, structured logs and clean shutdown.
- **Quality:** about 90 Go test cases and 149 frontend tests. Coverage is 100% on the backend's `internal/` packages and 100% of lines on the frontend.

---

## Contents

- [Quick start (Docker)](#quick-start-docker)
- [Running locally](#running-locally)
- [Tests and coverage](#tests-and-coverage)
- [API reference](#api-reference)
- [Using the calculator](#using-the-calculator)
- [Project structure](#project-structure)
- [Design decisions](#design-decisions)
- [Assumptions and limitations](#assumptions-and-limitations)
- [AI usage and prompts](#ai-usage-and-prompts)

---

## Quick start (Docker)

Requires Docker with Compose v2.

```bash
docker compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8080 |

Both images run their test suites while building, and the backend runs them with the race detector (`go test -race`). An image with failing tests can't be built.

## Running locally

**Prerequisites:** Go 1.27+, Node.js 24+ and npm 11+.

**Backend** at http://localhost:8080. The port can be changed with the `PORT` environment variable.

```bash
cd backend
go run ./cmd/server
```

**Frontend** at http://localhost:5173:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server forwards `/api/*` to `http://localhost:8080`, so start the backend first.

## Tests and coverage

**Backend**

```bash
cd backend
go vet ./...
go test -cover ./...

# Detailed report
go test -coverprofile=coverage.out ./internal/...
go tool cover -func=coverage.out     # per function
go tool cover -html=coverage.out     # opens an HTML report
```

`go test -race` needs CGO and a C compiler. It runs in the Docker build (`docker compose build backend`), so it isn't needed on your machine.

**Frontend**

```bash
cd frontend
npm test              # run all tests once
npm run coverage      # tests + coverage (text, HTML in coverage/, lcov)
npm run typecheck     # tsc
npm run lint          # oxlint
```

Coverage thresholds are set to 90% in `vite.config.ts`, and the coverage run fails if any metric drops below them.

**Latest results.** The full reports are in [`docs/coverage/`](docs/coverage).

| Layer                                          | Tests    | Statements | Branches | Functions | Lines |
|------------------------------------------------|----------|-----------:|---------:|----------:|------:|
| Backend `internal/calculator`, `internal/api`  | ~90 cases | 100%      | n/a      | 100%      | n/a   |
| Frontend `src/`                                | 149      | 99.4%      | 98.5%    | 100%      | 100%  |

`cmd/server/main.go` only wires things together (configuration, logger, server start and shutdown) and has no logic of its own, so it isn't unit tested. It is exercised by the Docker build and the smoke tests.

What the tests cover:

- **Backend**
  - Table-driven tests for every operation and edge case: ÷0, `0^-1`, `√-4`, `(-8)^(1/3)`, overflow.
  - HTTP tests with `httptest` for every status code and error code: invalid JSON, `null` values, unknown fields, data after the JSON body, wrong content type, bodies that are too large.
  - Routing, and the panic-recovery and request-logging middleware.
- **Frontend**
  - The reducer, which is pure logic with no React, tested with an exhaustive table of state changes.
  - Number formatting, the keyboard mapping, and the API client with `fetch` stubbed.
  - The presentational components.
  - Full user flows with React Testing Library and `user-event` against a mocked API module. These include `60 − 30% = 42`, chained operations, errors, keys disabled while a request runs, `AC` cancelling it, and keyboard input.

---

## API reference

Base path: `/api/v1`. Every response is JSON.

### `GET /api/v1/health`

```bash
curl http://localhost:8080/api/v1/health
# {"status":"ok"}
```

### `POST /api/v1/calculate/{operation}`

The request body holds the operands `a` and `b`. `sqrt` takes only `a`.

| Operation    | Body             | Result                        |
|--------------|------------------|-------------------------------|
| `add`        | `{"a": 2, "b": 3}` | `a + b` → `5`               |
| `subtract`   | `{"a": 4, "b": 10}`| `a − b` → `-6`              |
| `multiply`   | `{"a": 6, "b": 7}` | `a × b` → `42`              |
| `divide`     | `{"a": 10, "b": 4}`| `a ÷ b` → `2.5`             |
| `power`      | `{"a": 2, "b": 10}`| `a ^ b` → `1024`            |
| `sqrt`       | `{"a": 9}`         | `√a` → `3`                  |
| `percentage` | `{"a": 30, "b": 60}`| **a% of b** (`a × b / 100`) → `18` |

**Success (200)**

```bash
curl -X POST http://localhost:8080/api/v1/calculate/divide \
  -H "Content-Type: application/json" \
  -d '{"a": 10, "b": 4}'
# {"operation":"divide","result":2.5}

curl -X POST http://localhost:8080/api/v1/calculate/sqrt \
  -H "Content-Type: application/json" \
  -d '{"a": 9}'
# {"operation":"sqrt","result":3}

curl -X POST http://localhost:8080/api/v1/calculate/percentage \
  -H "Content-Type: application/json" \
  -d '{"a": 30, "b": 60}'
# {"operation":"percentage","result":18}
```

**Errors.** Every error has the same format:

```json
{ "error": { "code": "DIVISION_BY_ZERO", "message": "division by zero is undefined" } }
```

| Status | Code                     | When                                                                 |
|--------|--------------------------|----------------------------------------------------------------------|
| 400    | `INVALID_JSON`           | Malformed JSON, non-numeric operands, numbers too large to represent (e.g. `1e400`), unknown fields, more than one JSON value |
| 400    | `INVALID_INPUT`          | `a` or `b` missing or `null`, or `b` sent to `sqrt`                  |
| 404    | `UNKNOWN_OPERATION`      | The operation isn't supported (e.g. `modulo`)                        |
| 413    | `PAYLOAD_TOO_LARGE`      | Body larger than 1 KiB                                               |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | `Content-Type` isn't `application/json`                              |
| 422    | `DIVISION_BY_ZERO`       | `divide` by 0, or `power` with base 0 and a negative exponent        |
| 422    | `NEGATIVE_SQUARE_ROOT`   | `sqrt` of a negative number                                          |
| 422    | `UNDEFINED_RESULT`       | The result isn't a number, e.g. `power` of `-8` to `1/3`             |
| 422    | `RESULT_OUT_OF_RANGE`    | The result overflows a float64, e.g. `multiply` `1e308` by `10`      |
| 500    | `INTERNAL_ERROR`         | Unexpected server error (no details exposed)                         |

```bash
curl -i -X POST http://localhost:8080/api/v1/calculate/divide \
  -H "Content-Type: application/json" -d '{"a": 10, "b": 0}'
# HTTP/1.1 422 Unprocessable Entity
# {"error":{"code":"DIVISION_BY_ZERO","message":"division by zero is undefined"}}

curl -i -X POST http://localhost:8080/api/v1/calculate/add \
  -H "Content-Type: application/json" -d '{"a": 1, "b": null}'
# HTTP/1.1 400 Bad Request
# {"error":{"code":"INVALID_INPUT","message":"field \"b\" is required and must be a number"}}

curl -i -X POST http://localhost:8080/api/v1/calculate/add \
  -H "Content-Type: application/json" -d '{"a": "1", "b": 2}'
# HTTP/1.1 400 Bad Request
# {"error":{"code":"INVALID_JSON","message":"field \"a\" must be a valid number"}}

curl -i -X POST http://localhost:8080/api/v1/calculate/modulo \
  -H "Content-Type: application/json" -d '{"a": 5, "b": 2}'
# HTTP/1.1 404 Not Found
# {"error":{"code":"UNKNOWN_OPERATION","message":"unknown operation \"modulo\""}}
```

> On Windows PowerShell, use `curl.exe` and escape the inner quotes, or run the examples from Git Bash or WSL.

---

## Using the calculator

It works like a classic pocket calculator. Each operation runs as soon as the next operator or `=` is pressed, strictly **left to right**.

| Keys                | Display                        | API calls                                  |
|---------------------|--------------------------------|--------------------------------------------|
| `12 + 3 =`          | `12 + 3 =` / **15**            | `add(12, 3)`                               |
| `2 + 3 × 4 =`       | `5 ×` then **20**              | `add(2, 3)`, `multiply(5, 4)`              |
| `60 − 30 % =`       | `60 −` / 18, then **42**       | `percentage(30, 60)`, `subtract(60, 18)`   |
| `60 × 30 % =`       | 0.3, then **18**               | `percentage(30, 1)`, `multiply(60, 0.3)`   |
| `50 %`              | **0.5**                        | `percentage(50, 1)`                        |
| `9 √`               | **3**                          | `sqrt(9)`                                  |
| `8 ÷ 0 =`           | **Cannot divide by zero**      | `divide(8, 0)` → 422                       |

- **Percentage works like Apple's calculator.** After `+` or `−`, `x%` means "x percent of the left-hand number" (`60 − 30%` means `60 − 18`). Everywhere else it means `x / 100`.
- **Operators:** pressing a second operator right after the first replaces it. `=` right after an operator ignores that operator (`5 + =` gives `5`). After a result, typing a digit starts a new calculation and pressing an operator continues from the result.
- **Input rules:** a number can have at most 15 digits and one decimal point. `±` changes the sign, and `⌫` deletes the last digit.
- **While a request is running:** every key except `AC` is disabled, and `AC` cancels the request.
- **Keyboard:** `0–9`, `.`, `+ - * / ^ %`, `Enter` or `=`, `Backspace`, `Escape` or `Delete` (clears everything).

---

## Project structure

```
.
├── backend/
│   ├── cmd/server/main.go          # wiring: config, logger, HTTP server, graceful shutdown
│   ├── internal/calculator/        # pure domain: operations and domain errors (no HTTP)
│   ├── internal/api/               # HTTP layer: router, handlers, error mapping, middleware
│   └── Dockerfile
├── frontend/
│   ├── src/api/calculatorApi.ts    # typed fetch client and ApiError
│   ├── src/calculator/             # pure logic: reducer (state machine), formatting, keyboard mapping
│   ├── src/hooks/useCalculator.ts  # side effects: runs API calls, keyboard listener
│   ├── src/components/             # Calculator (container), Display and Keypad (presentational)
│   ├── nginx.conf                  # production static server + /api proxy
│   └── Dockerfile
├── docs/
│   ├── coverage/                   # latest coverage reports
│   └── PROMPTS.md                  # AI prompts used to build this project
└── docker-compose.yml
```

---

## Design decisions

### Backend

**Go's standard library instead of Gin.** Since Go 1.22, `http.ServeMux` can match on the HTTP method and on path parameters (`POST /api/v1/calculate/{operation}`, `r.PathValue`). That covers everything this service needs. Using the standard library means no third-party dependencies (`go.mod` has no `require` lines), no framework to learn, and a very small image (about 9 MB). The cost is a few small helpers (JSON decoding and writing, and the middleware), which are all in `internal/api`.

**API shape: one route with the operation as a path parameter.** Three options were considered:

| Option | Pros | Cons |
|--------|------|------|
| One route per operation (`/add`, `/divide`, …) | Explicit, can have a different body per route | Handler and route code repeated for every operation, and every new operation touches the HTTP layer |
| One endpoint with the operation in the body (`/calculate` + `{"operation": ...}`) | Least routing code | All operations share one URL (logs and metrics can't tell them apart), and an unknown operation is a body error instead of a 404 |
| **`/calculate/{operation}` (chosen)** | One handler, a table-driven design where **adding an operation is one line** in `internal/calculator`, and each operation still has its own URL for logs, docs and a natural 404 | The body shape depends on the operation (handled by each operation's number of operands) |

**POST with a JSON body instead of GET with query parameters.** JSON keeps number types (`"1"` vs `1`), makes input checking strict (unknown fields, `null`, extra data), and can grow without changing the URL. Calculations are side-effect free, so GET would also be defensible, but it would push input checking into string parsing.

**Versioned path (`/api/v1`),** so the contract can change later without breaking existing clients.

**Layers.** `internal/calculator` is pure domain logic: `Operation{Name, Arity}` with `Apply(a, b)`, looked up in a table, plus sentinel errors. It knows nothing about HTTP, so its tests don't need a server. `internal/api` translates between HTTP and the domain. `cmd/server` only wires things together. Dependencies point one way: `api` uses `calculator`. `internal/` stops other modules from importing these packages.

**Error model.**
- **Domain errors are sentinel values** (`ErrDivisionByZero`, …). The HTTP layer maps them to a status and error code in one table (`errors.go`) using `errors.Is`.
- **400 means the request is malformed. 422 means the request is well formed but mathematically impossible** (division by zero). Clients can then tell "fix your request" apart from "this calculation has no answer".
- **Every error uses the same `{"error": {"code", "message"}}` format.** The `code` is stable and meant for programs; the frontend maps it to its own messages. The `message` is for people.
- **Unknown errors become a generic 500,** so internal details never reach the client.

**Strict input handling.**
- **Operand fields are `*float64`.** A missing field or `null` is caught instead of silently becoming `0`, because `{"a": 5, "b": null}` must not return 5.
- **Numbers too large for a float64** (`1e400`) are rejected.
- **Other checks:** `Content-Type` must be `application/json`, bodies are limited to 1 KiB (`http.MaxBytesReader`), unknown fields are rejected (`DisallowUnknownFields`), and exactly one JSON value is allowed. Decoder errors are rewritten so Go type names don't leak to clients.
- **Results must be finite.** `Apply` rejects NaN and ±Inf, which aren't meaningful results and can't be encoded as JSON.

**float64 arithmetic.** IEEE-754 doubles are the natural fit for a general calculator and for JSON numbers. The known downside (`0.1 + 0.2 = 0.30000000000000004`) is handled in the display, which shows 15 significant digits, rather than by adding a decimal library. The API returns the exact float so clients can decide how to present it.

**Production readiness.**
- **Server timeouts** (`ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout`) protect against slow-client attacks such as Slowloris.
- **Clean shutdown** with `signal.NotifyContext` and `Server.Shutdown`: in-flight requests finish when the container stops. This was verified with `docker compose stop` (exit code 0).
- **Structured JSON logs** with `log/slog`, one line per request (method, path, status, duration).
- **Panic recovery middleware** returns a JSON 500 instead of dropping the connection. It still re-raises `http.ErrAbortHandler`, following the `net/http` convention.
- **Configuration through environment variables** (`PORT`). The service is **stateless**, so it can run as several copies.
- **Container:** multi-stage build, static binary (`CGO_ENABLED=0`), `distroless/static:nonroot` runtime with no shell and a non-root user.

### Frontend

**The frontend handles interaction; the backend does all the arithmetic.** The frontend only decides *which* operation to request and *when*. That keeps the backend as a simple, reliable math service and puts the interaction logic in one testable place.

**A pure reducer that describes requests as data.** `src/calculator/reducer.ts` is a `useReducer` state machine with no React or network code. A key that needs the backend doesn't call it. Instead, the reducer stores a description of the call in state: `request: {id, operation, a, b, then}`. `then` says what to do with the result: carry on to the next operator, finish the `=` expression, or replace the number on screen after `%` or `√`. This means:
- All calculator behavior, including *which* API call `%` makes, is tested as plain functions.
- `useCalculator` only has to run whatever request the state describes and send back `requestSucceeded` or `requestFailed`.
- **Request ids** make it safe to ignore a late response that arrives after `AC`.

**Hook and component split.** `useCalculator` holds every side effect: the API call with an `AbortController`, and the keyboard listener. `Calculator` is a thin container. `Display` and `Keypad` only render what they're given. The keypad keys are defined as data (label, accessible name, action, style).

**API client.** `calculate()` turns every failure into an `ApiError(code, message)`: the backend's error, an unreachable backend, a response from a proxy that isn't JSON, or a response without a result. Bodies are checked with type guards instead of `as` casts. Codes become short messages for the display ("Cannot divide by zero").

**Formatting.** Results are shown with up to 15 significant digits, thousands separators, and exponent notation outside 1e-7 to 1e15. The number being typed is shown as typed, so `0.50` stays `0.50`. Chained calculations use the full-precision value, not the rounded one on screen.

**Accessibility and responsiveness.**
- Every key has an `aria-label`, the result is an `<output aria-live="polite">`, and the pending operator uses `aria-pressed`.
- Keyboard focus is visible, and the full keyboard is supported. Pressing `Enter` doesn't also click whichever key has focus.
- The calculator is a `max-w-sm` card that fills the width on phones.

**Testing approach.**
- **Most tests are for pure functions** (reducer, formatting, keyboard mapping, API client). They're fast and exhaustive.
- **A smaller set of integration tests** renders `<Calculator />` with the API module mocked (`vi.mock`) by a fake backend that does real arithmetic, and drives it with `user-event` exactly as a user would.

### Cross-cutting

**Same origin instead of CORS.** In development the Vite proxy forwards `/api`; in Docker, nginx does. The browser only ever talks to one origin, so the backend needs no CORS configuration, and the frontend uses the same relative URLs everywhere.

**Docker.**
- Both images **run their test suites as part of the build.** The backend runs `go vet` and `go test -race` on a Debian build image, which includes the C compiler the race detector needs.
- **Both run as non-root:** distroless for the backend, `nginx-unprivileged` for the frontend.
- **nginx** caches hashed assets as `immutable` and falls back to `index.html` for unknown paths.

---

## Assumptions and limitations

- **Operations run left to right, with no operator precedence** (`2 + 3 × 4 = 20`), like a basic pocket calculator. Precedence would need an expression parser on the backend or an operator stack on the frontend. It was left out deliberately to keep the scope matched to the 2–4 hour timebox.
- **Percentage** follows Apple's convention described above. On the API, `percentage` always means "a% of b". The frontend sends `b = 1` when it wants a plain `a / 100`.
- **Precision:** float64 arithmetic. The display rounds to 15 significant digits.
- **Input limits:** typed numbers are limited to 15 digits. The API accepts any finite float64.
- **Not in scope:** authentication, rate limiting, calculation history and persistence. The service is stateless.
- **Plain-text router responses:** Go's router returns plain text for 404s on unknown paths and for 405s (method not allowed). Every response from our own handler, including unknown operations, uses the JSON error format.
- **Local race detector:** `go test -race` needs CGO. On a machine without a C compiler, use the Docker build.

---

## AI usage and prompts

This project was built with **Claude Code** (Anthropic) as a pair-programming assistant. All planning decisions, reviews and commits were approved step by step by me. The prompts I used are in [`docs/PROMPTS.md`](docs/PROMPTS.md).
