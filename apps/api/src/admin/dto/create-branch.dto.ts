import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString() @Length(2, 20) code!: string;
  @IsString() @Length(2, 150) name!: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}
