import {
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

export function unauthorizedWithCode(errorCode: string, message: string) {
  return new UnauthorizedException({ statusCode: 401, errorCode, message });
}

export function forbiddenWithCode(errorCode: string, message: string) {
  return new ForbiddenException({ statusCode: 403, errorCode, message });
}

export function conflictWithCode(errorCode: string, message: string) {
  return new ConflictException({ statusCode: 409, errorCode, message });
}
