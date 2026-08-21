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

## Deploy Contract

SCRUM-161 records the deploy behavior that SCRUM-164 or a later pipeline should
automate. A deploy should build the SPA, sync the built files to the private bucket,
then invalidate CloudFront:

```bash
npm run build:web

aws s3 sync src/pulseUI/dist "s3://<bucket-name>" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude index.html

aws s3 cp src/pulseUI/dist/index.html "s3://<bucket-name>/index.html" \
  --cache-control "no-cache,max-age=0,must-revalidate" \
  --content-type text/html

aws cloudfront create-invalidation \
  --distribution-id "<distribution-id>" \
  --paths "/*"
```

`deployment/spa/deploy-config.json` captures these settings as a Terraform and
pipeline handoff contract. It is not an executable deployment by itself.
