import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateMeasurementUnitDto {
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'El código solo admite mayúsculas, números y guion bajo.' })
  code!: string;

  @IsString() @Length(1, 40) name!: string;
  @IsString() @Length(1, 12) abbreviation!: string;
  @IsInt() @Min(0) @Max(2) decimals!: number;
}
