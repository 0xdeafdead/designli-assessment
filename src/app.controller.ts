import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/parse')
  parseEmail(
    @Body() input: { emailPath: string | undefined; url: string | undefined },
  ) {
    return this.appService.parseEmail(input);
  }
}
