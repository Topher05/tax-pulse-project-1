# SPA Delivery Module

Creates the SCRUM-161 static frontend delivery layer:

- Private S3 bucket with public access blocked.
- Bucket-owner-enforced object ownership.
- AES256 server-side encryption.
- CloudFront Origin Access Control.
- CloudFront distribution with `index.html` default root object.
- `403` and `404` rewrites to `/index.html` with status `200` for SPA routes.
- Outputs for SPA deploy syncs and CloudFront invalidations.

Required inputs are `name_prefix` and `environment`. Optionally pass
`bucket_name` when you need a pre-approved global S3 bucket name.
