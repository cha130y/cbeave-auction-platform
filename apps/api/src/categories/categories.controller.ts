import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryActivationResponseDto } from './dto/category-activation-response.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Get()
  findAll(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findActiveTree();
  }

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.createCategory({
      ...createCategoryDto,
      adminUserId: currentUser.sub,
    });
  }

  @Patch(':categoryId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.updateCategory({
      ...updateCategoryDto,
      categoryId,
      adminUserId: currentUser.sub,
    });
  }

  @Patch(':categoryId/activate')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  activate(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<CategoryActivationResponseDto> {
    return this.categoriesService.setCategoryActivation({
      categoryId,
      adminUserId: currentUser.sub,
      isActive: true,
    });
  }

  @Patch(':categoryId/deactivate')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<CategoryActivationResponseDto> {
    return this.categoriesService.setCategoryActivation({
      categoryId,
      adminUserId: currentUser.sub,
      isActive: false,
    });
  }
}
