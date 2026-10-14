const MATCHER_NAME = "toHaveHttpResponse"

export function toHaveHttpResponse(response, expectedStatus, expectedBody) {
  if (arguments.length < 3) {
    throw new TypeError(
      `${MATCHER_NAME} requires an expected status and body. Pass undefined explicitly for an undefined body.`
    )
  }

  if (typeof expectedStatus !== "number" || !Number.isFinite(expectedStatus)) {
    throw new TypeError("expectedStatus must be a finite number.")
  }

  if (typeof response !== "object" || response === null) {
    throw new TypeError("received value must be a non-null HTTP response object.")
  }

  const receivedStatus = response.status
  if (typeof receivedStatus !== "number" || !Number.isFinite(receivedStatus)) {
    throw new TypeError(
      "received response.status must be a finite number; an Express status() method is not a response status value."
    )
  }

  if (typeof this?.equals !== "function") {
    throw new TypeError("the test runner must provide an equality function for custom matchers.")
  }

  const equalityTesters = [...(this.customTesters ?? [])]
  const iterableEquality = this.utils?.iterableEquality
  if (typeof iterableEquality === "function" && !equalityTesters.includes(iterableEquality)) {
    equalityTesters.push(iterableEquality)
  }

  const receivedBody = response.body
  const statusMatches = receivedStatus === expectedStatus
  const bodyMatches = this.equals(receivedBody, expectedBody, equalityTesters)
  const pass = statusMatches && bodyMatches

  return {
    pass,
    message: () =>
      formatMessage(this, {
        expectedBody,
        expectedStatus,
        receivedBody,
        receivedStatus,
        statusMatches,
        bodyMatches,
      }),
  }
}

function formatMessage(context, result) {
  const hint = matcherHint(context)
  if (context.isNot) {
    return [
      hint,
      "",
      "Expected the response not to match this HTTP contract:",
      `Expected status: ${printValue(context, "printExpected", result.expectedStatus)}`,
      `Received status: ${printValue(context, "printReceived", result.receivedStatus)}`,
      `Expected body: ${printValue(context, "printExpected", result.expectedBody)}`,
      `Received body: ${printValue(context, "printReceived", result.receivedBody)}`,
    ].join("\n")
  }

  const lines = [hint]
  if (!result.statusMatches) {
    lines.push(
      "",
      `Status mismatch: expected ${printValue(context, "printExpected", result.expectedStatus)}, received ${printValue(context, "printReceived", result.receivedStatus)}.`
    )
  }

  if (!result.bodyMatches) {
    lines.push(
      "",
      "Body mismatch:",
      `Expected body: ${printValue(context, "printExpected", result.expectedBody)}`,
      `Received body: ${printValue(context, "printReceived", result.receivedBody)}`
    )
  }

  return lines.join("\n")
}

function matcherHint(context) {
  if (typeof context.utils?.matcherHint === "function") {
    return context.utils.matcherHint(
      `.${MATCHER_NAME}`,
      undefined,
      "expectedStatus, expectedBody",
      { isNot: context.isNot }
    )
  }

  const negation = context.isNot ? ".not" : ""
  return `expect(received)${negation}.${MATCHER_NAME}(expectedStatus, expectedBody)`
}

function printValue(context, formatterName, value) {
  const formatter = context.utils?.[formatterName]
  if (typeof formatter === "function") {
    return formatter(value)
  }

  return String(value)
}
