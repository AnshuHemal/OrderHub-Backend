import { IsNotEmpty, IsString, IsNumber, IsOptional, ValidateNested, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Espresso Beans' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'g' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @Min(0)
  minThreshold: number;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() quantity?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() minThreshold?: number;
}

export class RecipeItemDto {
  @ApiProperty({ example: 'clw1234567890abcdef' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 18 })
  @IsNumber()
  @Min(0)
  quantityRequired: number;
}

export class UpdateRecipeDto {
  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  ingredients: RecipeItemDto[];
}
