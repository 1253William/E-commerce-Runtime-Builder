import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  get() { return { ok: true, service: "seltra-nest-api", environment: process.env.NODE_ENV ?? "development" }; }
}
