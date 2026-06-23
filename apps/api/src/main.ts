import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: config.get<string>("CORS_ORIGIN") ?? "http://localhost:5173",
    credentials: true,
  });

  const port = Number(config.get<string>("PORT") ?? 3000);
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
