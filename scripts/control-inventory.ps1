$folder = "D:\repos\Azure IaC Guardrail\catalog\services\production"

Get-ChildItem -Path $folder -Filter "*.json" -File |
ForEach-Object {
    $file = $_.FullName
    $json = Get-Content -Path $file -Raw | ConvertFrom-Json

    foreach ($control in $json.controls) {
        [PSCustomObject]@{
            File        = $_.Name
            ServiceId   = $json.serviceId
            ControlId   = $control.id
            Title       = $control.title
            Description = $control.description
            Attribute   = $control.attribute
        }
    }
} 