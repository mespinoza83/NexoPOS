import { IsString, IsUUID, Length } from 'class-validator';

export class CreateCashRegisterDto {
  @IsUUID() branchId!: string;
  @IsString() @Length(2, 30) code!: string;
  @IsString() @Length(2, 100) name!: string;
}
