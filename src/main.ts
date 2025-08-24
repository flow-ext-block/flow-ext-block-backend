import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: ['/health'], // 특정 엔드포인트는 prefix 제외 가능
  });
  const ALLOWED_ORIGINS = new Set<string>([
    'https://www.flow-ext-block.site',
    'https://flow-ext-block.site',
    'http://localhost:5173',
  ]);

  app.enableCors({
    origin(
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) {
      // 서버-서버/헬스체크(Origin 없는 요청) 허용
      if (!origin || ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true, // 쿠키/인증 헤더 허용
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400, // Preflight 캐시(초)
    optionsSuccessStatus: 204,
  });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
