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

## 9. UX: traces for unary operations and instant percentage

> Claude, there is a problem regarding UX, when the user press a unary operator like % or √, the number changes instantly and they lose track of what just happened. update the reducer logic:
>
> Add a "trace" concept to the state. when a unary operation runs, the UI should show a small trace above the main result explaining the transformation (e.g. showing √9 or 20%=), this trace should clear upon the next digit or operator
>
> Currently if a user types 80 + 20%, the screen shows 16 and waits for =. let's make it smarter. If there's a pending operation, hitting % should calculate the percentage AND inmediatly autoresolve the pending math. so 80 + 20% should instantly result in 96, leaving a trace of "80 + 20%=", update the test aswell

**Result:**
- **`trace` in the reducer state:** `√9`, `20% =`, `80 + 20% =`, `9 + √16`, `12 + 3 =`. It clears on the next digit, decimal point, sign change or operator.
- **Derived small line:** the stored `expression` string was replaced by a selector that combines the pending operation with the trace.
- **Instant percentage:** `%` with a pending operation now makes two chained API calls, `percentage(20, 80)` then `add(80, 16)`, and shows 96 right away.
- **Tests:** reducer and integration tests updated, 164 tests in total.

## 10. Operation history and Sezzle brand polish

> Great job, commit and push it, let's add one more UX feature: An operation history and for the UI we'll polish the UI to match sezzle's brand identity
>
> - Whenever a final result is calculated, either by pressing equals or auto-resolved, save the full equation string to a history array. persist this array in the browser's local storage
>
> - Cap the history at the last 20 operations, when a new one is added, the oldest one should drop off
>
> - Add a subtle history/clock SVG icon button near the top left of the calculator display area to toggle the history panel
>
> - For the mobile UX, the history panel should act as an overlay that completely covers the keypad area, but leaves the main display visible
>
> - On desktop, opening the history should NOT cover the keypad. Instead the main calculator card should expand horizontally, a side by side layout, calculator on the left, history panel on the right with a subtle vertical divider
>
> - Inside the history panel, each item should be right aligned, show the equation string and the final result below
>
> - A clear history button should be added aswell, to wipe the localStorage and the state, write the necessary test
>
> Regarding the UI polish
>
> - I have placed the official sezzle's logo at sezzle-logo.svg in the public folder, place this logo centered just above the calculator display area, sized acordingly to the device you're on
>
> - Upgrade the UI to a premium dark brand vibe matching the icon's background. Use bg-[#1A0B2E] for the main page background and bg-[#2D1144] for the calculator card
>
> - Use Sezzle's brand colors for accents and buttons: Primary Purple (#8333D4), Coral/Pink (#FF5667), Green (#00B874), and Orange (#FF5B00). For example, make operator buttons purple and the equals button green or coral. Keep number buttons in sleek dark tones with soft rounded corners

**Result:**
- **History logic:** a pure history module (cap of 20, validated `localStorage` load and save) and a `useHistory` hook. Final results are recorded through an `onCalculated` callback on `useCalculator`, using a pure `finalExpression` helper in the reducer.
- **UI:** a history toggle (clock icon, `aria-expanded`) and a history panel.
- **Layout:** one CSS grid. On phones the panel covers the keypad's cell exactly; on desktop it becomes a side column behind a divider, and the calculator column keeps its width.
- **Brand:** Sezzle palette as Tailwind theme tokens, the logo inside the `<h1>`, the Sezzle icon as favicon, and a dark text on the green equals key for contrast.
- **Tests:** 197 in total, including clearing history from both the state and `localStorage`.

## 11. History interactions, glassmorphism and responsive sizing

> Yes commit and push it, The UI is looking great, but we need to polish the UX, styling, and responsiveness. Please implement these refinements:
>
> - Make the history items clickable buttons.
>
> - When a user clicks a history item, it should restore the calculator's state.
>
> - Apply a premium glassmorphism effect to the history panel
>
> - Use Tailwind classes like bg-[#2D1144]/60 backdrop-blur-xl border border-white/10 to get that frosted glass look over the background.
>
> - On mobile screens, the calculator should NOT look like a floating card. It must take up the entire screen
>
> - The rounded card layout should only apply on sm: breakpoints and up.
>
> - On laptops, the UI currently overflows vertically and requires scrolling, it needs to fit perfectly on shorter screen without scrolling
>
> Write and update any neccesary test

**Result:**
- **Restoring from history:** history entries are buttons. A new `restore` reducer action brings back the result and its equation. The overlay closes after a pick on smaller screens, and entries are disabled while a request is running.
- **Glass panel:** frosted-glass history panel with a thin scrollbar.
- **Sizing:** full screen on phones; a rounded card only from `sm`, with a height capped by the viewport; flexible keypad rows. Checked for no scrolling at nine viewport sizes, from 360×640 to 1920×1080, including 1280×600 laptops.
- **Tests:** 209 in total.

## 12. Giving the glass something to blur

> before pushing, you're right, The desktop glassmorphism feels flat because there's nothing vibrant behind it to blur. Let's implement your suggestion to fix this

**Result:**
- **Brand glow:** a decorative `BrandGlow` layer of blurred blobs in the four accent colors, anchored to the page center in rem so coral and orange sit behind the history column.
- **Translucent card** from `sm`, with no `backdrop-filter` of its own, so the panel's blur can reach the glow. The panel is lighter on desktop.
- **Phones:** unchanged.
- **Accessibility fix:** a new App test caught that the heading's accessible name was "SezzleCalculator"; the logo alt text is now "Sezzle Calculator".

---

## Commit history

| Commit | Stage |
|--------|-------|
| `chore: scaffold Go backend and React frontend` | Scaffold |
| `feat(backend): add calculator domain operations` | Domain logic with table-driven tests |
| `feat(backend): add calculate endpoint with validation and middleware` | HTTP layer, error format, middleware |
| `feat(frontend): add API client, calculator state machine and formatting` | Pure frontend logic |
| `feat(frontend): add calculator UI with keyboard support` | Hook, components, integration tests |
| `build: add Dockerfiles and docker compose setup` | Containers, nginx, race-enabled tests in the build |
| `docs: add README, design rationale, coverage reports and prompts` | Documentation |
| `feat(frontend): add traces for unary steps and resolve pending math on %` | UX improvement (prompt 9) |
| `feat(frontend): add persisted operation history and Sezzle brand styling` | History panel and brand polish (prompt 10) |
| `feat(frontend): restore from history, glass panel and viewport-fitted layout` | History interactions, responsive sizing and brand glow (prompts 11–12) |
