import { expect as jestExpect } from "expect"
import { expect as vitestExpect } from "vitest"

import { toHaveHttpResponse } from "@klondikemarlen/expect-http-response"

jestExpect.extend({ toHaveHttpResponse })
vitestExpect.extend({ toHaveHttpResponse })

jestExpect({ status: 200, body: { ok: true } }).toHaveHttpResponse(200, {
  ok: true,
})
vitestExpect({ status: 200, body: { ok: true } }).toHaveHttpResponse(200, {
  ok: true,
})
