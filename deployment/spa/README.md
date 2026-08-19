# SPA Delivery Contract

SCRUM-161 defines how the built TaxPulse SPA should be served from S3 behind
CloudFront. These files are production-shaped contracts for SCRUM-164 Terraform
modules, not final hand-applied infrastructure.

The contract expects:

- A private S3 bucket for `src/pulseUI/dist`.
- Public S3 access blocked at the bucket level.
- CloudFront Origin Access Control as the only read path into the bucket.
- CloudFront default root object set to `index.html`.
- `403` and `404` responses rewritten to `/index.html` with `200` so client-side
  SPA routes resolve after refresh or direct navigation.
- Deploys to sync changed build artifacts and create a CloudFront invalidation.

SCRUM-164 should replace the `SCRUM-164_*` placeholders with Terraform resources
or outputs for the S3 bucket, bucket regional domain name, origin access control,
CloudFront distribution, cache policy, and distribution ID.

## Deploy

Build the SPA, sync it to the private bucket, then invalidate CloudFront:

```bash
npm run build:web

TAXPULSE_SPA_BUCKET="<bucket-name>" \
TAXPULSE_CLOUDFRONT_DISTRIBUTION_ID="<distribution-id>" \
npm run aws:spa-deploy
```

The deploy script uploads hashed assets with long-lived immutable cache headers,
uploads `index.html` with no-cache headers, and invalidates `/*` so changed assets
and client-side routes are refreshed at the edge.
