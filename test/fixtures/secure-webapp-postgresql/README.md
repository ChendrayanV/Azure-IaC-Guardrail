# Secure Web App with PostgreSQL

This fixture deploys a Linux Azure Web App with secure internet access and a private Azure Database for PostgreSQL Flexible Server.

The Web App is the only internet-facing component. It requires HTTPS, disables FTPS, enforces TLS 1.2, enables HTTP/2, applies IP restrictions, and routes outbound traffic through VNet integration. PostgreSQL is deployed into a delegated subnet with public network access disabled and private DNS linked to the virtual network.

## Resources

- Resource group
- Virtual network with separate app and database subnets
- Database subnet network security group
- Private DNS zone for PostgreSQL Flexible Server
- Log Analytics workspace and Application Insights
- Linux App Service plan
- Linux Web App with system-assigned managed identity
- PostgreSQL Flexible Server and application database
- Diagnostic settings for the Web App and PostgreSQL

## Usage

Create a local tfvars file from the example and replace the placeholder values:

```powershell
terraform init
terraform plan -var-file="development.tfvars"
```

Keep real secrets out of source control. Provide `database_admin_password` through a secure local file, environment variable, or CI secret store.
