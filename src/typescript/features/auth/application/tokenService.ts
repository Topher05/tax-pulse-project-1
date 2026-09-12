import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";

import { importPKCS8, SignJWT } from "jose";

import type {
  AccessTokenClaims,
  AuthenticatedPrincipal,
  IssuedTokenPair,
} from "../domain/authTypes.js";
import type { JwtConfig } from "../infrastructure/authConfig.js";
import type { JwtRs256IssuerConfig } from "../infrastructure/jwtRs256Config.js";
import type { RefreshTokenRepository } from "../persistence/refreshTokenRepository.js";

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
  if (!options.rs256IssuerConfig && !options.config.signingSecret) {
    throw new Error("RS256 issuer configuration is required.");
  }
  const now = options.now ?? (() => new Date());
  const randomBytes = options.randomBytes ?? nodeRandomBytes;
  const issuerConfig = options.rs256IssuerConfig;
  const signingKey = issuerConfig
    ? importPKCS8(issuerConfig.signingPrivateKeyPem, "RS256")
    : new TextEncoder().encode(options.config.signingSecret);

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
      } satisfies Omit<AccessTokenClaims, "sub" | "aud" | "iss" | "iat" | "exp">)
        .setProtectedHeader(
          issuerConfig
            ? { alg: "RS256", kid: issuerConfig.signingKeyId, typ: "JWT" }
            : { alg: "HS256", typ: "JWT" },
        )
        .setSubject(principal.userId)
        .setIssuer(options.config.issuer)
        .setAudience(options.config.audience ?? "taxpulse-http-api")
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
