# Azure Storage SPA

This fixture creates:

- one resource group;
- one StorageV2 account;
- an Azure Storage static website; and
- inline `index.html` and `404.html` blobs containing a small hash-routed SPA.

Copy the example variables and replace the placeholder IDs and globally unique
storage account name:

```powershell
Copy-Item development.tfvars.example development.tfvars
terraform init
terraform validate
terraform plan -var-file=development.tfvars
terraform apply -var-file=development.tfvars
```

Terraform prints the static website URL as `spa_url`.

The example enables shared-key authentication because the AzureRM
`azurerm_storage_blob` resource uses the storage data plane to upload the
inline HTML. For a production SPA, deploy built assets through a workload
identity pipeline and place Azure Front Door or a CDN in front of the site.
