# Changelog

## 2026.06.4

- Added Aqua AVD benchmark references and enforceable controls for App Service,
  Function Apps, Container Registry, PostgreSQL, Key Vault, Resource Groups,
  and Storage.
- Added plan-only nested attribute evaluation, `oneOf`, and collection
  `contains` operators.
- Added controls for managed identity, tagging, diagnostics, TLS, VNet
  integration, remote debugging, CMK encryption, firewall defaults, soft
  delete, queue logging, Entra authentication, and high availability.

## 2026.06.3

- Added a required Microsoft Learn reference URL to every executable control.
- Added Azure Linux and Windows Function App coverage to the application
  platform controls.
- Added a Function App control for disabling FTP basic authentication.
- Added the production multi-service Terraform fixture used for extension
  demonstrations and end-to-end scans.

## 2026.06.2

- Expanded the enforceable baseline across storage, networking, Key Vault,
  compute, databases, containers, application platforms, messaging, AI, and
  monitoring services.
- Added controls for private access, modern TLS, local-authentication
  reduction, managed security features, deletion protection, secure boot,
  platform patching, and workload identity.
- Validated Terraform attributes against AzureRM provider 4.76.

## 2026.06.1

- Added storage controls for public network access, blob/file/table/queue
  private endpoints, secure transfer, TLS 1.2, and Shared Key authorization.
- Added a conditional recommendation for customer-managed keys on storage
  accounts tagged as production and sensitive.
- Recorded Azure Storage encryption at rest as an inherited platform assurance.

## 2026.06.0

- Introduced domain-based control catalogs for storage, networking, Key Vault,
  and databases.
- Added the storage public-access and SQL minimum-TLS controls.
