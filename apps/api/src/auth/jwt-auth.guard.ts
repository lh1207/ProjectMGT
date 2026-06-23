import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Exported for use by every protected controller across all modules.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
