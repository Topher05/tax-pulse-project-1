import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";

import { importPKCS8, SignJWT } from "jose";

import type {
  AccessTokenClaims,
  AuthenticatedPrincipal,
  IssuedTokenPair,
} from "./authTypes.js";
import type { JwtConfig } from "./authConfig.js";
import type { JwtRs256IssuerConfig } from "./jwtRs256Config.js";
import type { RefreshTokenRepository } from "./refreshTokenRepository.js";

export interface TokenService {
  issue(principal: AuthenticatedPrincipal): Promise<IssuedTokenPair>;
  revokeRefreshToken(rawRefreshToken: string): Promise<boolean>;
  rotateRefreshToken(rawRefreshToken: string): Promise<IssuedTokenPair | null>;
}

export interface CreateTokenServiceOptions {
  config: JwtConfig;
  rs256IssuerConfig?: JwtRs256IssuerConfig;
  refreshTokenRepository: RefreshTokenRepository;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
}

function toWholeSecondDate(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function hashRefreshToken(rawRefreshToken: string): string {
  return createHash("sha256").update(rawRefreshToken, "utf8").digest("hex");
}

export function createTokenService(options: CreateTokenServiceOptions): TokenService {
  const now = options.now ?? (() => new Date());
  const randomBytes = options.randomBytes ?? nodeRandomBytes;
  const signingKey = options.rs256IssuerConfig === undefined
    ? new TextEncoder().encode(options.config.signingSecret)
    : importPKCS8(options.rs256IssuerConfig.signingPrivateKeyPem, "RS256");

  const service: TokenService = {
    async issue(principal) {
      const issuedAt = toWholeSecondDate(now());
      const accessTokenExpiresAt = addSeconds(
        issuedAt,
        options.config.accessTokenLifetimeSeconds,
      );
      const refreshTokenExpiresAt = addSeconds(
        issuedAt,
        options.config.refreshTokenLifetimeSeconds,
      );
      const issuedAtSeconds = issuedAt.getTime() / 1000;
      const expiresAtSeconds = accessTokenExpiresAt.getTime() / 1000;
      const rawRefreshToken = randomBytes(32).toString("base64url");
      const tokenHash = hashRefreshToken(rawRefreshToken);

      const accessToken = await new SignJWT({
        role: principal.role,
        tenant_id: principal.tenantId,
      } satisfies Omit<AccessTokenClaims, "sub" | "iss" | "iat" | "exp">)
        .setProtectedHeader(
          options.rs256IssuerConfig === undefined
            ? { alg: "HS256", typ: "JWT" }
            : {
                alg: "RS256",
                kid: options.rs256IssuerConfig.signingKeyId,
                typ: "JWT",
              },
        )
        .setSubject(principal.userId)
        .setIssuer(options.config.issuer)
        .setIssuedAt(issuedAtSeconds)
        .setExpirationTime(expiresAtSeconds)
        .sign(await signingKey);

      await options.refreshTokenRepository.persist({
        userId: principal.userId,
        tokenHash,
        issuedAt,
        expiresAt: refreshTokenExpiresAt,
      });

      return {
        accessToken,
        refreshToken: rawRefreshToken,
        accessTokenExpiresInSeconds: options.config.accessTokenLifetimeSeconds,
        refreshTokenExpiresInSeconds: options.config.refreshTokenLifetimeSeconds,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      };
    },

    async revokeRefreshToken(rawRefreshToken) {
      return await options.refreshTokenRepository.revokeByTokenHash({
        tokenHash: hashRefreshToken(rawRefreshToken),
        revokedAt: toWholeSecondDate(now()),
      });
    },

    async rotateRefreshToken(rawRefreshToken) {
      const currentTime = toWholeSecondDate(now());
      const tokenHash = hashRefreshToken(rawRefreshToken);
      const principal = await options.refreshTokenRepository.findActivePrincipalByTokenHash({
        tokenHash,
        now: currentTime,
      });

      if (principal === null) {
        return null;
      }

      const wasRevoked = await options.refreshTokenRepository.revokeByTokenHash({
        tokenHash,
        revokedAt: currentTime,
      });

      return wasRevoked ? await service.issue(principal) : null;
    },
  };

  return service;
}
