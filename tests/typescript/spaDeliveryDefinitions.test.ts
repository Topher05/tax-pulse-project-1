import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

type Tag = {
  Key: string;
  Value: string;
};

type SpaBucketDefinition = {
  bucketName: string;
  publicAccessBlock: Record<string, boolean>;
  ownershipControls: {
    ObjectOwnership: string;
  };
  serverSideEncryption: {
    SSEAlgorithm: string;
  };
  tags: Tag[];
};

type BucketPolicyDefinition = {
  Statement: Array<{
    Sid: string;
    Effect: string;
    Principal: {
      Service: string;
    };
    Action: string;
    Resource: string;
    Condition: {
      StringEquals: Record<string, string>;
    };
  }>;
};

type CloudFrontDistributionDefinition = {
  DefaultRootObject: string;
  Origins: Array<{
    DomainName: string;
    OriginAccessControlId: string;
  }>;
  DefaultCacheBehavior: {
    ViewerProtocolPolicy: string;
    Compress: boolean;
    CachePolicyId: string;
  };
  CustomErrorResponses: {
    Items: Array<{
      ErrorCode: number;
      ResponsePagePath: string;
      ResponseCode: string;
    }>;
  };
};

type DeployConfigDefinition = {
  buildCommand: string;
  buildDirectory: string;
  bucketName: string;
  cloudFrontDistributionId: string;
  sync: {
    deleteRemovedFiles: boolean;
    immutableAssetCacheControl: string;
    indexCacheControl: string;
  };
  invalidation: {
    paths: string[];
  };
};

function readSpaJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(new URL(`../../deployment/spa/${fileName}`, import.meta.url), "utf8"));
}

describe("SCRUM-161 SPA delivery definitions", () => {
  test("defines a private S3 bucket contract for built SPA assets", () => {
    const bucket = readSpaJson<SpaBucketDefinition>("bucket.json");

    expect(bucket.bucketName).toBe("SCRUM-164_SPA_BUCKET_NAME");
    expect(bucket.publicAccessBlock).toEqual({
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    });
    expect(bucket.ownershipControls.ObjectOwnership).toBe("BucketOwnerEnforced");
    expect(bucket.serverSideEncryption.SSEAlgorithm).toBe("AES256");
  });

  test("allows CloudFront, not public internet, to read objects", () => {
    const policy = readSpaJson<BucketPolicyDefinition>("bucket-policy.json");
    const readStatement = policy.Statement[0];

    expect(readStatement).toMatchObject({
      Sid: "AllowCloudFrontReadOnly",
      Effect: "Allow",
      Principal: {
        Service: "cloudfront.amazonaws.com",
      },
      Action: "s3:GetObject",
      Resource: "arn:aws:s3:::SCRUM-164_SPA_BUCKET_NAME/*",
    });
    expect(readStatement?.Condition.StringEquals["AWS:SourceArn"]).toBe(
      "SCRUM-164_CLOUDFRONT_DISTRIBUTION_ARN",
    );
  });

  test("defines CloudFront SPA fallback behavior", () => {
    const distribution = readSpaJson<CloudFrontDistributionDefinition>("cloudfront-distribution.json");

    expect(distribution.DefaultRootObject).toBe("index.html");
    expect(distribution.Origins).toContainEqual(
      expect.objectContaining({
        DomainName: "SCRUM-164_SPA_BUCKET_REGIONAL_DOMAIN_NAME",
        OriginAccessControlId: "SCRUM-164_ORIGIN_ACCESS_CONTROL_ID",
      }),
    );
    expect(distribution.DefaultCacheBehavior).toMatchObject({
      ViewerProtocolPolicy: "redirect-to-https",
      Compress: true,
      CachePolicyId: "SCRUM-164_STATIC_ASSET_CACHE_POLICY_ID",
    });
    expect(distribution.CustomErrorResponses.Items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ErrorCode: 403,
          ResponsePagePath: "/index.html",
          ResponseCode: "200",
        }),
        expect.objectContaining({
          ErrorCode: 404,
          ResponsePagePath: "/index.html",
          ResponseCode: "200",
        }),
      ]),
    );
  });

  test("defines sync and CloudFront invalidation for deploys", () => {
    const deployConfig = readSpaJson<DeployConfigDefinition>("deploy-config.json");

    expect(deployConfig).toMatchObject({
      buildCommand: "npm run build:web",
      buildDirectory: "src/pulseUI/dist",
      bucketName: "SCRUM-164_SPA_BUCKET_NAME",
      cloudFrontDistributionId: "SCRUM-164_CLOUDFRONT_DISTRIBUTION_ID",
    });
    expect(deployConfig.sync).toEqual({
      deleteRemovedFiles: true,
      immutableAssetCacheControl: "public,max-age=31536000,immutable",
      indexCacheControl: "no-cache,max-age=0,must-revalidate",
    });
    expect(deployConfig.invalidation.paths).toEqual(["/*"]);
  });
});
