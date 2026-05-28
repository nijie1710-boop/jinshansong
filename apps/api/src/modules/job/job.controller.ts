import { Controller, Post } from "@nestjs/common";
import { JobService } from "./job.service";

@Controller("jobs")
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post("process-store-timeouts")
  processStoreTimeouts() {
    return this.jobService.processStoreTimeouts();
  }
}
