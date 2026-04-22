import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
    handleRequest(err, user) {
        return user || null;
    }

    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }
}
