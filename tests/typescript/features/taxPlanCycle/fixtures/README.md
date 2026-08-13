# TIVS SOAP Fixtures

The `tinEinValidation.wsdl` fixture mirrors the legacy Federal Taxpayer
Identification Verification Service shape used by SCRUM-139. It intentionally keeps the
legacy `http://localhost:8081/tivs` SOAP address so tests can verify that the client
overrides the endpoint after loading the WSDL.

Synthetic taxpayer samples:

| TIN | Type | Legal name | VerifyTaxpayer | Status |
| --- | --- | --- | --- | --- |
| `12-3456789` | `EIN` | `ACME GOVERNMENT SERVICES LLC` | `0` | `ACTIVE` |
| `219-09-9999` | `SSN` | wrong name | `3` | not exercised by SCRUM-139 |
| `00-0000000` | `EIN` | any name | `2` | TaxpayerNotFoundFault |

Match code meanings:

| Code | Meaning |
| --- | --- |
| `0` | TIN and legal name match |
| `1` | TIN was not issued |
| `2` | TIN was not found |
| `3` | TIN and legal name do not match |
