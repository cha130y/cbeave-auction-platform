import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { configureSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //converts the incoming Cookie header into:request.cookies.refresh_token
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );

  app.enableShutdownHooks();

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    configureSwagger(app);
  }

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);
  console.log(`CBeave API running at http://localhost:${port}`);
}
void bootstrap();
