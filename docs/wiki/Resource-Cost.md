# Resource Cost

**Status: Preview**

Resource Cost appears after a plan scan. It uses declared Terraform
configuration, workspace assumptions, and the unauthenticated Microsoft Retail
Prices API to estimate supported resources.

The view:

- Groups helper resources under the Azure billing parent where possible.
- Estimates supported fixed compute SKUs.
- Estimates Storage from configured capacity and operation assumptions.
- Shows the region, currency, quantities, and assumptions used.
- Marks unsupported or usage-dependent services instead of inventing a price.

The result is not an Azure quote, invoice, reservation recommendation, or
guarantee. It excludes negotiated discounts, taxes, dynamic consumption,
commitments, and services that cannot be priced safely from the plan.

Configure monthly assumptions in **Azure Pre-configuration** and validate
important estimates with the Azure Pricing Calculator or your billing data.
