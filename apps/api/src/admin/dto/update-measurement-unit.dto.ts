import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateMeasurementUnitDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 12)
  abbreviation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  decimals?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
