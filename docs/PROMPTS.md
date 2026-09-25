# Prompts

This project was built with **Claude Code** (Anthropic's CLI coding agent) as a pair programmer. Below are the prompts I used, in order and unedited, with short notes on what each one produced. I reviewed every stage before it was committed and pushed.

---

## 1. Scaffolding

> Hey claude, let's scaffold a technical assesment, a full stack calculator, a frontend in react, typescript and tailwind css, a backend in golang, the backend should be a microservice exposing a rest-api, let's scaffold the project first, create the environment, the frontend and the backend folder and install the required dependencies for each, sending to you also the technical assesment instructions
>
> *[the assessment instructions were pasted here]*

**Result:** a git repo, a Go module with a minimal `net/http` server and health endpoint, and a Vite + React + TypeScript + Tailwind v4 frontend with Vitest, Testing Library and a dev proxy to the backend.

## 2. Questioning the scaffold

> Okey, what is that about that config you added of the vite dev server only communicating without needing cors config, should we delete that? the deliberable should have that?, and about the scaffold in go, you did not only created a go and react project right?

**Result:** an explanation of why the Vite proxy avoids CORS in development, and how nginx does the same in production, plus a list of everything the scaffold added beyond `go mod init` / `npm create vite`.

## 3. Planning the API and the UI

> Nah that's great then, let's plan the development of the technical assesment, and then why commit the scaffol and start developing, so now. review once again the instructions, lets focus firt on the api, we should design a clean, readable, idiomatic and extensible api, should we use one single endpoint for each operation? or one endpoint which recieves the operation parameter. think about the trade-offs and advantages of this two approaches, I consider we should use the native http net of go instead of gin, consider any other aspect of the go microservice that should be explained and detailed in the design rationale.
>
> then, the frontend. I consider a good design is a classic calculator design in which you select the first operand, then the operator, and then you select the next operand and click on equals to get the result, when writing the second operand, the first one and the operation appears up there in a smaller box right, what do you think about this? also think about the frontend design keeping in mind that it should also be tested

**Decision:** of the three API shapes compared, I chose **one route with the operation as a path parameter** (`POST /api/v1/calculate/{operation}`).

## 4. Apple-style behavior

> Yes, I'd like that approach, I know is hard to explain but when the user should be able to input 10 + 10^2, or 60 + 30%, similar to how the apple's calculator work, explain what do we need to achieve that behaviour

**Result:** a first plan with an expression parser on the backend to support operator precedence and context-dependent percentages.

## 5. Stress-testing the plan with examples

> Claude, I noticed that you planned to implement a expression evaluator, considering you implement this, show me valid inputs for the calculator, and show me invalid inputs for the calculator, considering we execute the plan as we discussed

**Result:** tables of valid and invalid inputs. They exposed an inconsistency in the percentage rule and led to decisions on edge cases (e.g. `5 + =` drops the trailing operator).

## 6. Cutting scope

> Hold on. This plan is heavily over-engineered for an Intern assessment with a 2-4 hour timebox. The instructions explicitly say: 'Prioritize correctness, clarity, and maintainability over extra features.' Building a custom Lexer, Recursive Descent Parser, and AST in Go to evaluate string expressions is massive scope creep and introduces unnecessary complexity.Let's pivot to a much simpler, atomic approach:No Lexer/Parser/AST in Go. Drop the internal/expression package and the /evaluate endpoint entirely.Backend is strictly atomic: Expose dynamic routes like POST /api/v1/calculate/{operation} (e.g., add, subtract, multiply, divide, power, sqrt, percentage). The JSON body simply receives {"a": 10, "b": 5}. The backend acts as a dumb, reliable math engine.Smart Frontend: React will handle the state machine (using useReducer). For intermediate operations like Apple's percentage (e.g., 60 - 30%), the frontend calculates the percentage step by making a quick API call to /percentage, updates the UI, and then makes the final /subtract call when '=' is pressed.Drop Playwright. The assessment asks for unit tests. We will stick to Vitest + React Testing Library for the frontend and standard testing for Go.Keep the good stuff: Keep the internal/calculator domain logic, the robust error envelope, the Docker setup, and the rigorous unit test coverage.

**Result:** the final plan. The backend only performs single operations (`percentage` = a% of b). The frontend is a `useReducer` state machine that evaluates left to right, with Apple-style `%` done as one API call.

## 7. Execution workflow

> Yes, the plan is absolutely great, let's execute step by step to every commit stage, make sure the commits are not coauthored by claude, also, The remote repo link is "git remote add origin https://github.com/samuelescYT/Sezzle-calculator.git" add the oring, and on each commit stage, whem I review the changes and accept to commit we will also push the cahnges to the repository

## 8. Stage reviews

I reviewed each stage (the diff summary, test results and coverage) before approving it:

> Yes, this is excellent, Dropping the local -race flag due to missing CGO is perfectly fine for this stateless package; we'll rely on the Docker build for that. Please proceed with the commit

> yes, proceed with the commit and push

> Perfect! please commit this, push it and move on with the plan

> Yes, commit it

> Docker desktop is initialized

> Yes, commit and push it

| Commit | Stage |
|--------|-------|
| `chore: scaffold Go backend and React frontend` | Scaffold |
| `feat(backend): add calculator domain operations` | Domain logic with table-driven tests |
| `feat(backend): add calculate endpoint with validation and middleware` | HTTP layer, error format, middleware |
| `feat(frontend): add API client, calculator state machine and formatting` | Pure frontend logic |
| `feat(frontend): add calculator UI with keyboard support` | Hook, components, integration tests |
| `build: add Dockerfiles and docker compose setup` | Containers, nginx, race-enabled tests in the build |
| `docs: add README, design rationale, coverage reports and prompts` | This documentation |
