import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { configureSwagger } from './config/swagger.config';
import { EnvVariable } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvVariable>);

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
    origin: configService.get('WEB_APP_URL', { infer: true }),
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    configureSwagger(app);
  }

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port, '0.0.0.0');
  console.log(`CBeave API running at http://localhost:${port}`);
}
void bootstrap();
