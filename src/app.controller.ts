import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable } from 'rxjs';
import { ParserInputDTO } from './dto/parserInput.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/parse')
  parseEmail(@Body() input: ParserInputDTO): Observable<string> {
    return this.appService.parseEmail(input);
  }
}
