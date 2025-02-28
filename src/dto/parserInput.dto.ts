import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ParserInputDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emailPath: string | undefined;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  url: string | undefined;
}
