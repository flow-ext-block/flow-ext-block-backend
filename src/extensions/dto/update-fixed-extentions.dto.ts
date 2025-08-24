import { IsBoolean } from 'class-validator';

export class UpdateFixedExtensionDto {
  @IsBoolean()
  blocked: boolean;
}
