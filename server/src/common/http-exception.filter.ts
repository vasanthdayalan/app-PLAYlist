import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface CustomErrorBody {
  code?: string;
  message?: string | string[];
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const custom = typeof body === 'string' ? undefined : (body as CustomErrorBody);
      const message = typeof body === 'string' ? body : (custom?.message ?? exception.message);
      const payload: ErrorBody = {
        error: {
          code: custom?.code ?? codeForStatus(status),
          message: Array.isArray(message) ? 'Validation failed' : String(message),
          details: custom?.details ?? (Array.isArray(message) ? message : undefined),
        },
      };
      response.status(status).json(payload);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    const payload: ErrorBody = {
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    default:
      return 'HTTP_ERROR';
  }
}
