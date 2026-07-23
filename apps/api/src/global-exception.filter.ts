import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = response.locals.requestId as string | undefined;
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;

    const message =
      typeof exceptionResponse === "object" && exceptionResponse && "message" in exceptionResponse
        ? (exceptionResponse as { message: unknown }).message
        : exception instanceof HttpException
          ? exception.message
          : "Lỗi máy chủ nội bộ";

    if (status >= 500) {
      process.stderr.write(
        `${JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          event: "http_exception",
          requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode: status,
          error: exception instanceof Error ? exception.message : String(exception)
        })}\n`
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.originalUrl,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
}
