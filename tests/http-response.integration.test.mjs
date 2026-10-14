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
