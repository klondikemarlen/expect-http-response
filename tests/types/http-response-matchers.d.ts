import "expect"
import "vitest"

declare module "expect" {
  interface Matchers<R extends void | Promise<void>, T = unknown> {
    toHaveHttpResponse(expectedStatus: number, expectedBody: unknown): R
  }
}

declare module "vitest" {
  interface Matchers<R, T> {
    toHaveHttpResponse(expectedStatus: number, expectedBody: unknown): R
  }
}
