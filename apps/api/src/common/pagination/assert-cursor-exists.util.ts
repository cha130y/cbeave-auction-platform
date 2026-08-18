import { BadRequestException } from '@nestjs/common';

type CursorExistsDelegate<Where> = {
  findFirst(args: {
    where: Where;
    select: { id: true };
  }): Promise<{ id: string } | null>;
};

export async function assertCursorExists<Where>(
  delegate: CursorExistsDelegate<Where>,
  where: Where,
  message: string,
): Promise<void> {
  const cursorExists = await delegate.findFirst({
    where,
    select: { id: true },
  });

  if (!cursorExists) {
    throw new BadRequestException(message);
  }
}
