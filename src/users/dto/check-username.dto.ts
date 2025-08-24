import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CheckUsernameDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^[a-z0-9]+$/)
  username: string;
}
