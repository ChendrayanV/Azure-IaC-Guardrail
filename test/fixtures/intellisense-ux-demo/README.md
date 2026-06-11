# IntelliSense UX demo

Open this directory as the VS Code workspace, then run:

```text
Azure IaC Guardrail: Scan Terraform Files
```

This fixture is intentionally non-compliant. It exists to demonstrate the
editor experience without running Terraform or connecting to Azure.

## 1. Fix a value in dev.tfvars

Open `dev.tfvars`. Guardrail marks:

```hcl
public_network_access_enabled = true
remote_debugging_enabled      = true
```

Hover either line to see:

- What the setting means.
- Current and required values.
- The resource that consumes the value.
- Plain-language remediation.

Press `Ctrl+.` and choose **Change value to false**.

## 2. Fix a value in a nested block

Open `main.tf` and locate:

```hcl
site_config {
  minimum_tls_version = "1.0"
}
```

Guardrail marks the exact value. Press `Ctrl+.` and choose:

```text
Change value to "1.2"
```

## 3. Add a missing secure attribute

The web app intentionally omits:

```hcl
ftp_publish_basic_authentication_enabled = false
```

Use the preferred Quick Fix on the resource finding to insert it.

## 4. See focused nested IntelliSense

Add a blank line inside `site_config` and press `Ctrl+Space`.

Suggestions are limited to settings applicable inside `site_config`, such as:

- Always On
- Minimum TLS Version
- Remote Debugging Enabled

Each suggestion shows the recommended Terraform expression, requirement title,
plain-language reason, and control ID.

## Expected experience

- Actionable failures are shown individually.
- `.tfvars` values are marked where users can change them.
- Nested values are marked on the exact line.
- Safe scalar fixes are one click.
- Plan-only checks with no editable static value are grouped into one
  informational message.
- Irrelevant Azure settings are not shown in completion suggestions.
