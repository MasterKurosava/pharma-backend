import { BadRequestException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOriginsRaw = process.env.CORS_ORIGINS ?? '';
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const fieldErrors: Record<string, string[]> = {};

        const walk = (errList: ValidationError[], prefix = '') => {
          for (const err of errList) {
            const path = prefix ? `${prefix}.${err.property}` : err.property;
            const constraints = err.constraints ? Object.values(err.constraints).filter(Boolean) : [];
            if (constraints.length) {
              fieldErrors[path] = (fieldErrors[path] ?? []).concat(constraints);
            }
            if (err.children?.length) {
              walk(err.children, path);
            }
          }
        };

        walk(errors);

        return new BadRequestException({
          message: 'Validation failed',
          fieldErrors,
        });
      },
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();