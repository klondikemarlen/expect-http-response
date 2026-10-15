import assert from "node:assert/strict"

import express from "express"
import { expect, test } from "vitest"
import request from "supertest"

import { toHaveHttpResponse } from "../index.mjs"

expect.extend({ toHaveHttpResponse })

const app = express()
app.get("/users/:id", (req, res) => {
  res.status(200).json({
    user: { id: Number(req.params.id), name: "Ada" },
  })
})

test("when the user exists, returns the complete HTTP response", async () => {
  // Arrange: the route above supplies user 7.
  // Act
  const response = await request(app).get("/users/7")

  // Assert
  expect(response).toHaveHttpResponse(200, {
    user: { id: 7, name: "Ada" },
  })
})

test("when one nested value differs in a large response, exposes that value without transport or collection noise", async () => {
  // Arrange
  const records = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    name: `Record ${index + 1}`,
    category: "standard",
    active: true,
  }))
  const body = { records, totalCount: 100 }
  const expectedBody = structuredClone(body)
  expectedBody.records[49].name = "Expected record 50"
  const application = express()
  application.get("/records", (_request, response) => response.json(body))

  // Act
  const response = await request(application).get("/records")

  // Assert
  assert.throws(
    () => expect(response).toHaveHttpResponse(200, expectedBody),
    (error) => {
      assert.match(error.message, /Expected record 50/u)
      assert.match(error.message, /Record 50/u)
      assert.doesNotMatch(error.message, /"Record 1"|"Record 100"/u)
      assert.doesNotMatch(error.message, /\[Object\]/u)
      assert.doesNotMatch(error.message, /x-powered-by|content-length|127\.0\.0\.1/u)
      return true
    }
  )
})
