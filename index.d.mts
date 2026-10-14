type EqualityTester = (this: any, ...values: any[]) => boolean | undefined

type EqualityFunction = (
  received: unknown,
  expected: unknown,
  customTesters?: EqualityTester[],
  strictCheck?: boolean
) => boolean

interface HttpResponseLike {
  readonly status: number
  readonly body?: unknown
}

interface MatcherUtils {
  matcherHint?: (
    matcherName: string,
    received?: string,
    expected?: string,
    options?: { isNot?: boolean }
  ) => string
  printExpected?: (value: unknown) => string
  printReceived?: (value: unknown) => string
  iterableEquality?: EqualityTester
}

interface MatcherContext {
  readonly isNot?: boolean
  readonly customTesters?: EqualityTester[]
  readonly equals: EqualityFunction
  readonly utils?: MatcherUtils
}

interface MatcherResult {
  readonly pass: boolean
  readonly message: () => string
}

export declare function toHaveHttpResponse(
  this: MatcherContext,
  received: HttpResponseLike,
  expectedStatus: number,
  expectedBody: unknown
): MatcherResult
