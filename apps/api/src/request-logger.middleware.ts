import type { NextFunction, Request, Response } from "express";

export function requestLoggerMiddleware(request: Request, response: Response, next: NextFunction) {
  const startedAt = performance.now();

  response.on("finish", () => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "info",
      event: "http_request",
      requestId: response.locals.requestId as string | undefined,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  });

  next();
}
