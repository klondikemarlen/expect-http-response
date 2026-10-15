import assert from "node:assert/strict"
import test from "node:test"

import { expect } from "expect"

import { toHaveHttpResponse } from "../index.mjs"

expect.extend({ toHaveHttpResponse })
expect.addEqualityTesters([
  (received, expected) => {
    if (!isTaggedLabel(received) || !isTaggedLabel(expected)) {
      return undefined
    }

    return received.value.toLowerCase() === expected.value.toLowerCase()
  },
])

await test("when status and body match, ignores circular transport fields", () => {
  // Arrange
  const transport = {}
  transport.self = transport
  const response = {
    status: 200,
    body: { message: "ready" },
    request: transport,
    socket: transport,
  }

  // Act / Assert: invoking the matcher is the behavior and assertion under test.
  expect(response).toHaveHttpResponse(200, { message: "ready" })
})

await test("when only status differs, reports the expected and received statuses", () => {
  // Arrange
  const response = { status: 503, body: { available: false } }

  // Act / Assert
  assert.throws(
    () => expect(response).toHaveHttpResponse(200, { available: false }),
    (error) => {
      assert.match(error.message, /Status mismatch/u)
      assert.match(error.message, /200/u)
      assert.match(error.message, /503/u)
      assert.doesNotMatch(error.message, /available/u)
      return true
    }
  )
})

await test("when a nested body value differs, reports both body values", () => {
  // Arrange
  const response = { status: 200, body: { user: { id: 7, name: "Grace" } } }

  // Act / Assert
  assert.throws(
    () => expect(response).toHaveHttpResponse(200, { user: { id: 7, name: "Ada" } }),
    (error) => {
      assert.match(error.message, /Body mismatch/u)
      assert.match(error.message, /name/u)
      assert.match(error.message, /Grace/u)
      assert.match(error.message, /Ada/u)
      return true
    }
  )
})

await test("when the body has unexpected keys, rejects a partial expected body", () => {
  // Arrange
  const response = { status: 200, body: { id: 7, unexpected: true } }

  // Act / Assert
  assert.throws(
    () => expect(response).toHaveHttpResponse(200, { id: 7 }),
    (error) => {
      assert.match(error.message, /Body mismatch/u)
      assert.match(error.message, /unexpected/u)
      return true
    }
  )
})

await test("when the status differs, negation accepts the different response contract", () => {
  // Arrange
  const response = { status: 200, body: { message: "ready" } }

  // Act / Assert
  expect(response).not.toHaveHttpResponse(404, { message: "ready" })
})

await test("when a large response matches, negation explains the match without dumping the body", () => {
  // Arrange
  const body = {
    matchedPayload: Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })),
  }
  const response = { status: 200, body }

  // Act / Assert
  assert.throws(
    () => expect(response).not.toHaveHttpResponse(200, body),
    (error) => {
      assert.match(error.message, /status and body both matched/u)
      assert.match(error.message, /200/u)
      assert.doesNotMatch(error.message, /matchedPayload|\[Object\]/u)
      return true
    }
  )
})

await test("when an unsent Express status method is supplied, rejects it even under negation", () => {
  // Arrange
  const response = {
    status() {
      return this
    },
    body: { message: "not sent" },
  }

  // Act / Assert
  assert.throws(
    () => expect(response).not.toHaveHttpResponse(200, { message: "not sent" }),
    /response\.status must be a finite number/u
  )
})

await test("when the expected status is invalid, rejects it even under negation", () => {
  // Arrange
  const response = { status: 200, body: undefined }

  // Act / Assert
  assert.throws(
    () => expect(response).not.toHaveHttpResponse("200", undefined),
    /expectedStatus must be a finite number/u
  )
})

await test("when the expected body is omitted, requires an explicit body argument", () => {
  // Arrange
  const response = { status: 200, body: undefined }

  // Act / Assert
  assert.throws(
    () => expect(response).not.toHaveHttpResponse(200),
    /requires an expected status and body/u
  )
})

await test("when the body is undefined, accepts an explicitly undefined expected body", () => {
  // Arrange
  const response = { status: 204 }

  // Act / Assert
  expect(response).toHaveHttpResponse(204, undefined)
})

await test("when the body is an empty object, compares the empty body", () => {
  // Arrange
  const response = { status: 200, body: {} }

  // Act / Assert
  expect(response).toHaveHttpResponse(200, {})
})

await test("when an asymmetric body is requested, honors its deliberate partial match", () => {
  // Arrange
  const response = { status: 200, body: { user: { id: 7, name: "Ada" } } }
  const expectedBody = { user: expect.objectContaining({ id: expect.any(Number) }) }

  // Act / Assert
  expect(response).toHaveHttpResponse(200, expectedBody)
})

await test("when iterable contents match, honors the runner's iterable equality", () => {
  // Arrange
  const response = { status: 200, body: { tags: new Set(["api", "ready"]) } }
  const expectedBody = { tags: new Set(["api", "ready"]) }

  // Act / Assert
  expect(response).toHaveHttpResponse(200, expectedBody)
})

await test("when iterable contents differ, rejects the different body", () => {
  // Arrange
  const response = { status: 200, body: { tags: new Set(["api", "ready"]) } }

  // Act / Assert
  assert.throws(
    () => expect(response).toHaveHttpResponse(200, { tags: new Set(["wrong"]) }),
    /Body mismatch/u
  )
})

await test("when custom equality applies, honors the runner-registered tester", () => {
  // Arrange
  const response = { status: 200, body: { label: { kind: "label", value: "READY" } } }
  const expectedBody = { label: { kind: "label", value: "ready" } }

  // Act / Assert
  expect(response).toHaveHttpResponse(200, expectedBody)
})

await test("when status and body differ, reports both failures", () => {
  // Arrange
  const response = { status: 503, body: { message: "temporarily offline" } }

  // Act / Assert
  assert.throws(
    () => expect(response).toHaveHttpResponse(200, { message: "ready" }),
    (error) => {
      assert.match(error.message, /200/u)
      assert.match(error.message, /503/u)
      assert.match(error.message, /temporarily offline/u)
      assert.match(error.message, /ready/u)
      return true
    }
  )
})

await test("when partial matches surround a body difference, does not expose fields excluded by those matches", () => {
  // Arrange
  const response = {
    status: 200,
    body: {
      records: [
        { id: 1, detail: "unrelated-first-record-detail" },
        { id: 2, name: "Actual record", detail: "unrelated-middle-record-detail" },
        { id: 3, detail: "unrelated-last-record-detail" },
      ],
    },
  }
  const expectedBody = {
    records: [
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 2, name: "Expected record" }),
      expect.objectContaining({ id: 3 }),
    ],
  }

  // Act / Assert
  assert.throws(
    () => expect(response).toHaveHttpResponse(200, expectedBody),
    (error) => {
      assert.match(error.message, /Expected record/u)
      assert.match(error.message, /Actual record/u)
      assert.doesNotMatch(error.message, /unrelated-first-record-detail/u)
      assert.doesNotMatch(error.message, /unrelated-last-record-detail/u)
      return true
    }
  )
})

function isTaggedLabel(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    value.kind === "label" &&
    typeof value.value === "string"
  )
}
