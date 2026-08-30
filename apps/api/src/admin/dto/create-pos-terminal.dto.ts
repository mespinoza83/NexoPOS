import { IsString, IsUUID, Length } from 'class-validator';

export class CreatePosTerminalDto {
  @IsUUID() branchId!: string;
  @IsUUID() bankId!: string;
  @IsString() @Length(2, 30) code!: string;
  @IsString() @Length(2, 150) name!: string;
}
