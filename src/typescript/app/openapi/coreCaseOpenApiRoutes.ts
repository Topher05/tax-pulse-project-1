import { Router } from "express";

import { createCoreCaseOpenApiDocument } from "./coreCaseOpenApi.js";

export function createCoreCaseOpenApiRouter(): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res
      .status(200)
      .type("application/json")
      .json(createCoreCaseOpenApiDocument());
  });

  return router;
}
