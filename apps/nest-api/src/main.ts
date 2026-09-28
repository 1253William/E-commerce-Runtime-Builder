import { config } from "dotenv";
import { createServer } from "node:net";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

config({ path: "../../.env" });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" });
  const preferredPort = Number(process.env.PORT ?? 3001);
  let port = preferredPort;

  while (!(await isPortAvailable(port))) port += 1;
  await app.listen(port);
  console.log(`[seltra] Nest API listening on http://localhost:${port}`);
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
}

bootstrap();
