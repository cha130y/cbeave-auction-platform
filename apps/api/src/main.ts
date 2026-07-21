import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);
  console.log(`CBeave API running at http://localhost:${port}`);
}
void bootstrap();
