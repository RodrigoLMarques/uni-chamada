import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  itemsPerPage: number = 20;
}

export type PaginationMeta = {
  page: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedItems<T> = {
  data: T[];
  pagination: PaginationMeta;
};

export function makePagination(
  page: number,
  itemsPerPage: number,
  totalItems: number,
): PaginationMeta {
  return {
    page,
    itemsPerPage,
    totalItems,
    totalPages: Math.ceil(totalItems / itemsPerPage),
  };
}
