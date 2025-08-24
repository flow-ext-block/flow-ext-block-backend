// src/extensions/dto/add-fixed-extentions.dto.ts
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class AddFixedExtensionItemDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9]+$/, { message: '확장자는 영문/숫자만 허용됩니다.' })
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
