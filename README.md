# @klondikemarlen/expect-http-response

Readable HTTP response failures for Jest and Vitest: focused status errors and contextual body diffs, without unrelated transport internals. One `expect` describes the status and complete body. This dependency-free ESM matcher is registered explicitly with your existing test runner.

## Why This Matcher Exists

`toHaveHttpResponse` expresses the response status and complete body as one HTTP contract, with focused diagnostics when that contract fails. Separate status and body assertions provide a useful comparison:

```js
expect(response.status).toEqual(200)
expect(response.body).toEqual(expectedBody)
```

Those assertions keep an incorrect status obvious and give the body its own native diff. A stock matcher can express the combined contract too:

```js
expect(response).toEqual(expect.objectContaining({ status: 200, body: expectedBody }))
```

However, a failure against the whole Supertest response can include unrelated headers, request metadata, and raw response text. `toMatchObject` is not an equivalent complete-body replacement: its partial matching can accept unexpected body fields.

`toHaveHttpResponse` combines the status and body checks while keeping their diagnostics focused:

```js
expect(response).toHaveHttpResponse(200, expectedBody)
```

- A status-only failure reports the differing statuses without printing the matching body.
- A body failure uses the active runner's contextual diff, exposing changed nested values rather than dumping both collections or hiding them as `[Object]`.
- If both differ, both failures are reported; separate assertions normally stop at the first failed status assertion.
- Failed negation explains that status and body both matched without printing the matching payload twice.

For example, a changed field among 100 response records remains visible in the diff (excerpt):

```diff
         "id": 50,
-        "name": "Expected record 50",
+        "name": "Record 50",
```

This changes the diagnostic boundary, not the equality policy. Complete-body comparison, deliberate asymmetric matches, and the runner's custom equality testers retain their existing meaning.

### Example: Whole-Response Failure

In a real controller test, the expected title of a returned notice was deliberately changed. On Vitest 4.1.11, the whole-response `toEqual(expect.objectContaining(...))` assertion above produced the following selected diff lines. Domain names and fixture values are anonymized; `...` marks omitted output:

```diff
-   "body": {
-     "notices": [
-       ObjectContaining {
-         "id": 1,
-         "title": "Scheduled maintenance",
...
+   "header": {
+     "content-type": "application/json; charset=utf-8",
...
+   "req": {
+     "method": "GET",
+     "url": "http://127.0.0.1:<port>/notices",
...
+   "text": "{\"notices\":[...\"title\":\"Active notice\"...]}",
```

The expected title appears under `body`, but the received title is embedded in escaped response text among unrelated transport details.

Using the same expected body with `toHaveHttpResponse` produced these selected lines instead:

```diff
Body mismatch:
- Expected
+ Received
...
-       "title": "Scheduled maintenance",
...
+       "title": "Active notice",
```

Both titles are now part of the body comparison, without headers, request metadata, or raw response text. Other body fields can still appear according to the runner's native asymmetric-match formatting.

## Installation

Install a published release as a development dependency:

```sh
npm install --save-dev @klondikemarlen/expect-http-response
```

Alternatively, install directly from this focused repository:

```sh
npm install --save-dev github:klondikemarlen/expect-http-response
```

Use an ESM project (`"type": "module"`) or `.mjs` setup/config files. The package has no runtime dependencies and exports `toHaveHttpResponse` from its root only. Consumers supply their own test runner and explicitly register the matcher; registration is not automatic.

## Registering the Matcher

Register once in the setup module for the runner you use. The examples use the runner's own `expect` instance.

### Jest

Jest setup files run after Jest initializes its assertion environment:

```js
// test/setup-http-response-matcher.mjs
import { expect } from "@jest/globals"
import { toHaveHttpResponse } from "@klondikemarlen/expect-http-response"

expect.extend({ toHaveHttpResponse })
```

```js
// jest.config.mjs
export default {
  setupFilesAfterEnv: ["<rootDir>/test/setup-http-response-matcher.mjs"],
}
```

For Jest's native ESM mode, invoke the existing Jest command with Node's VM-module support, for example:

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js
```

Preserve the project's existing transforms and test command when integrating the setup.

### Vitest

```js
// test/setup-http-response-matcher.mjs
import { expect } from "vitest"
import { toHaveHttpResponse } from "@klondikemarlen/expect-http-response"

expect.extend({ toHaveHttpResponse })
```

```js
// vitest.config.mjs
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    setupFiles: ["./test/setup-http-response-matcher.mjs"],
  },
})
```

### Other Compatible Runners

Import the matcher from the package root and extend the active runner's `expect` instance explicitly. The matcher relies on the runner's equality function and custom matcher context; it does not bundle or select a runner.

Focused failures use the runner's `utils.printDiffOrStringify`, which Jest and Vitest supply through `expect.extend`. Other compatible runners need a Jest- or Vitest-compatible version of that utility for contextual diffs; without it, only basic expected/received rendering is available.

## TypeScript

The package root resolves to `index.d.mts`. Add a declaration augmentation for each runner you actually install. For Jest's `expect` package:

```ts
// test/http-response-matchers.d.ts
import "expect"

declare module "expect" {
  interface Matchers<R extends void | Promise<void>, T = unknown> {
    toHaveHttpResponse(expectedStatus: number, expectedBody: unknown): R
  }
}
```

For Vitest:

```ts
// test/http-response-matchers.d.ts
import "vitest"

declare module "vitest" {
  interface Matchers<R, T> {
    toHaveHttpResponse(expectedStatus: number, expectedBody: unknown): R
  }
}
```

Ensure TypeScript includes the augmentation as well as the tests (merge these entries into the existing `include` paths rather than replacing source entries):

```json
{
  "include": ["src/**/*.ts", "test/**/*.ts", "test/http-response-matchers.d.ts"]
}
```

The TypeScript setup module must also be included if it is written in TypeScript. Explicitly importing `expect` from `vitest` or `@jest/globals` does not require runner globals in `compilerOptions.types`. Do not add an augmentation for a runner that is not installed.

For a Node.js project, keep `@types/node` installed and include `"node"` in `compilerOptions.types` if the project's configuration does not already load it. Node types are separate from Jest/Vitest globals.

## Example: Express and Supertest

This makes a real request to an Express route. The single assertion is the response contract; it makes no separate claim about persistence or other effects.

```ts
import express from "express"
import { expect, test } from "vitest"
import request from "supertest"
import { toHaveHttpResponse } from "@klondikemarlen/expect-http-response"

expect.extend({ toHaveHttpResponse })

const app = express()
app.get("/users/:id", (req, res) => {
  res.status(200).json({
    user: { id: Number(req.params.id), name: "Ada" },
  })
})

test("when the user exists, returns the complete user response", async () => {
  const response = await request(app).get("/users/7")

  expect(response).toHaveHttpResponse(200, {
    user: { id: 7, name: "Ada" },
  })
})
```

## Body Equality, Negation, and Invalid Arguments

`toHaveHttpResponse(status, body)` passes only when the numeric response `status` and complete `body` both match. Body comparison uses the active runner's equality function and custom equality testers, plus iterable equality when the runner exposes it, consistent with `toEqual`. Transport fields such as request, socket, or response internals are not inspected.

- Body equality is complete: unexpected body keys fail, just as they do with `toEqual`.
- Asymmetric values such as `expect.objectContaining(...)` deliberately request a partial body match.
- `.not` negates the combined status-and-body contract. It passes if either status or body differs and fails only when both match.
- The expected status and received `response.status` must be finite numbers. An Express `res.status()` method is not a sent response status.
- Invalid inputs throw even through `.not`; they are not treated as a successful negative assertion.
- Supply the body argument explicitly. Pass `undefined` when the expected response body is undefined.

## Package Development

The package's focused test suite includes matcher unit tests using Jest's `expect`, a real Express/Supertest integration test using Vitest, and strict TypeScript registration checks for both runners.

```sh
npm ci
npm test
npm run test:unit
npm run test:integration
npm run typecheck
```

## Release

From the repository's merged `main` branch, verify the package before tagging and publishing. Release publication is not complete until the registry artifact is installed and exercised:

```sh
npm test
npm pack --dry-run
git switch main
git pull --ff-only origin main
git tag v1.0.2
git push origin v1.0.2
gh release create v1.0.2 --title v1.0.2 --generate-notes
npm publish --access public
npm view @klondikemarlen/expect-http-response@1.0.2 version
```

In a separate consumer project, install the registry artifact:

```sh
npm install --save-dev @klondikemarlen/expect-http-response@1.0.2
```

After publishing, use the actual registry installation in a fresh consumer project and run its matcher and TypeScript registration checks. Do not claim npm availability until the publish and registry install have been observed.

## License

MIT. See [LICENSE](LICENSE).
