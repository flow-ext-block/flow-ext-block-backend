import {
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class AddCustomExtensionDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[a-z0-9]+$/, {
    message: '확장자는 영문 소문자와 숫자만 가능합니다.',
  })
  ext: string;
}

export class AddFixedExtensionItemDto {
  @IsString()
  // 필요 시 패턴 제한을 주고 싶다면 아래 주석 해제
  // @Matches(/^[a-zA-Z0-9]+$/, { message: '확장자는 영문/숫자만 허용됩니다.' })
  ext: string;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;
}

export class AddFixedExtentionsDto {
  @IsArray()
  @ArrayMinSize(1)
  items: AddFixedExtensionItemDto[];
}
