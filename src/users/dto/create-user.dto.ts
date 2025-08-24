import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다.' })
  @MaxLength(20, { message: '아이디는 20자 이하이어야 합니다.' })
  @Matches(/^[a-z0-9]+$/, {
    message: '아이디는 영문 소문자와 숫자만 사용할 수 있습니다.',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password: string;
}

export class UserResponseDto {
  id: string;
  username: string;
}
