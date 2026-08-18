import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const SWAGGER_PATH = 'docs';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('CBeave API')
    .setDescription(
      'REST API documentation for the CBeave real-time auction platform.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, documentFactory, {
    customSiteTitle: 'CBeave API Documentation',
    jsonDocumentUrl: `${SWAGGER_PATH}/openapi.json`,
    yamlDocumentUrl: `${SWAGGER_PATH}/openapi.yaml`,
  });
}
