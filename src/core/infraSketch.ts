export type SketchServiceType = string;
export type SketchParameterValue = string | number | boolean;

export interface SketchNode {
  id: string;
  serviceType: SketchServiceType;
  name: string;
  region: string;
  x: number;
  y: number;
  parameters?: Record<string, SketchParameterValue>;
}

export interface SketchConnection {
  id: string;
  source: string;
  target: string;
  bidirectional?: boolean;
}

export interface InfraSketch {
  version: 1;
  nodes: SketchNode[];
  connections: SketchConnection[];
}

export const SKETCH_SERVICES: Array<{
  type: SketchServiceType;
  title: string;
  short: string;
  color: string;
  category: string;
  description: string;
}> = [
  service("resource_group", "Resource Group", "RG", "#0078d4", "Management + Governance", "RESOURCE CONTAINER"),
  service("azure_advisor", "Azure Advisor", "ADV", "#38a169", "Management + Governance", "OPTIMIZATION RECOMMENDATIONS"),
  service("azure_arc", "Azure Arc", "ARC", "#0078d4", "Hybrid + Multicloud", "HYBRID MANAGEMENT"),
  service("azure_policy", "Azure Policy", "POL", "#7f56d9", "Management + Governance", "GOVERNANCE AND COMPLIANCE"),
  service("automation_account", "Automation Accounts", "AUT", "#2563eb", "Management + Governance", "PROCESS AUTOMATION"),
  service("cost_management", "Cost Management", "COST", "#16a34a", "Management + Governance", "COST OPTIMIZATION"),
  service("managed_application", "Managed Applications", "MA", "#0078d4", "Management + Governance", "MANAGED SOLUTIONS"),
  service("service_health", "Service Health", "HLTH", "#16a34a", "Management + Governance", "SERVICE STATUS"),
  service("app_configuration", "App Configuration", "CFG", "#2563eb", "Developer Tools", "CENTRALIZED APP SETTINGS"),
  service("application_insights", "Application Insights", "AI", "#7c3aed", "DevOps", "APPLICATION MONITORING"),
  service("azure_devops", "Azure DevOps", "ADO", "#0078d4", "DevOps", "PLAN BUILD AND RELEASE"),
  service("dev_box", "Microsoft Dev Box", "DEV", "#2563eb", "Developer Tools", "CLOUD DEVELOPER WORKSTATIONS"),
  service("load_testing", "Azure Load Testing", "LOAD", "#e11d48", "DevOps", "PERFORMANCE TESTING"),
  service("managed_grafana", "Managed Grafana", "GRAF", "#f97316", "DevOps", "OBSERVABILITY DASHBOARDS"),
  service("monitor", "Azure Monitor", "MON", "#2563eb", "DevOps", "FULL STACK MONITORING"),
  service("log_analytics", "Log Analytics", "LOG", "#ca8a04", "DevOps", "LOG QUERY AND ANALYSIS"),
  service("machine_learning", "Machine Learning", "ML", "#0078d4", "AI + Machine Learning", "MODEL DEVELOPMENT"),
  service("ai_foundry", "Azure AI Foundry", "AIF", "#7c3aed", "AI + Machine Learning", "GENERATIVE AI PLATFORM"),
  service("ai_search", "AI Search", "AIS", "#0284c7", "AI + Machine Learning", "AI ENRICHED SEARCH"),
  service("bot_service", "Azure Bot Service", "BOT", "#2563eb", "AI + Machine Learning", "CONVERSATIONAL AI"),
  service("computer_vision", "AI Vision", "VIS", "#7c3aed", "AI + Machine Learning", "IMAGE AND VIDEO ANALYSIS"),
  service("content_safety", "AI Content Safety", "SAFE", "#dc2626", "AI + Machine Learning", "CONTENT MODERATION"),
  service("document_intelligence", "Document Intelligence", "DOC", "#2563eb", "AI + Machine Learning", "DOCUMENT EXTRACTION"),
  service("language_service", "AI Language", "LANG", "#7c3aed", "AI + Machine Learning", "NATURAL LANGUAGE AI"),
  service("openai_service", "Azure OpenAI", "AOAI", "#0f766e", "AI + Machine Learning", "GENERATIVE AI MODELS"),
  service("speech_service", "AI Speech", "SPCH", "#0284c7", "AI + Machine Learning", "SPEECH TO TEXT"),
  service("translator", "AI Translator", "TR", "#2563eb", "AI + Machine Learning", "LANGUAGE TRANSLATION"),
  service("analysis_services", "Analysis Services", "AS", "#2563eb", "Analytics", "ENTERPRISE SEMANTIC MODELS"),
  service("data_explorer", "Data Explorer", "ADX", "#0078d4", "Analytics", "REAL TIME ANALYTICS"),
  service("data_factory", "Data Factory", "ADF", "#2563eb", "Analytics", "DATA INTEGRATION"),
  service("databricks", "Azure Databricks", "ADB", "#e11d48", "Analytics", "LAKEHOUSE ANALYTICS"),
  service("event_hubs", "Event Hubs", "EH", "#7c3aed", "Analytics", "STREAMING INGESTION"),
  service("hdinsight", "HDInsight", "HDI", "#2563eb", "Analytics", "OPEN SOURCE ANALYTICS"),
  service("power_bi_embedded", "Power BI Embedded", "PBI", "#eab308", "Analytics", "EMBEDDED ANALYTICS"),
  service("stream_analytics", "Stream Analytics", "ASA", "#0284c7", "Analytics", "REAL TIME STREAM PROCESSING"),
  service("synapse_analytics", "Synapse Analytics", "SYN", "#2563eb", "Analytics", "UNIFIED DATA ANALYTICS"),
  service("app_service", "App Services", "APP", "#2563eb", "Compute", "WEB HOSTING"),
  service("service_plan", "App Service Plan", "ASP", "#db2777", "Compute", "APP SERVICE COMPUTE"),
  service("web_app", "Web App", "WEB", "#e11d48", "Compute", "MANAGED WEB APPLICATION"),
  service("batch", "Azure Batch", "BAT", "#2563eb", "Compute", "ON-DEMAND VM CLUSTERS"),
  service("kubernetes_service", "Azure Kubernetes Service", "AKS", "#7c3aed", "Compute", "MANAGED KUBERNETES"),
  service("kubernetes_namespace", "Kubernetes Namespace", "NS", "#5b6ee1", "Containers", "SHARED CLUSTER TENANCY"),
  service("spring_apps", "Azure Spring Apps", "SPR", "#16a34a", "Compute", "SPRING APP HOSTING"),
  service("virtual_desktop", "Azure Virtual Desktop", "AVD", "#0284c7", "Compute", "VIRTUAL DESKTOP INFRASTRUCTURE"),
  service("vmware_solution", "Azure VMware Solution", "AVS", "#2563eb", "Compute", "VMWARE VSPHERE CLUSTERS"),
  service("container_instances", "Container Instances", "ACI", "#7c3aed", "Compute", "ON-DEMAND CONTAINERS"),
  service("dedicated_host", "Dedicated Host", "HOST", "#2563eb", "Compute", "PHYSICAL SERVERS"),
  service("functions", "Functions", "FUNC", "#f59e0b", "Compute", "SERVERLESS COMPUTE"),
  service("virtual_machine", "Virtual Machine", "VM", "#2563eb", "Compute", "ON-DEMAND VIRTUAL MACHINES"),
  service("vm_scale_sets", "Virtual Machine Scale Sets", "VMSS", "#2563eb", "Compute", "AUTOSCALING VIRTUAL MACHINES"),
  service("container_apps", "Container Apps", "ACA", "#7c3aed", "Containers", "SERVERLESS CONTAINERS"),
  service("container_registry", "Container Registry", "ACR", "#ea580c", "Containers", "CONTAINER IMAGE REGISTRY"),
  service("service_fabric", "Service Fabric", "SF", "#2563eb", "Containers", "MICROSERVICES PLATFORM"),
  service("cosmos_db", "Azure Cosmos DB", "COS", "#2563eb", "Databases", "GLOBALLY DISTRIBUTED NOSQL"),
  service("database_mysql", "Azure Database for MySQL", "MYSQL", "#0284c7", "Databases", "MANAGED MYSQL"),
  service("database_postgresql", "Azure Database for PostgreSQL", "PG", "#2563eb", "Databases", "MANAGED POSTGRESQL"),
  service("managed_instance", "SQL Managed Instance", "MI", "#0284c7", "Databases", "MANAGED SQL INSTANCE"),
  service("redis_cache", "Azure Managed Redis", "REDIS", "#dc2626", "Databases", "IN-MEMORY DATA STORE"),
  service("sql_server", "SQL Server", "SQL", "#0891b2", "Databases", "LOGICAL SQL SERVER"),
  service("sql_database", "SQL Database", "DB", "#0e7490", "Databases", "MANAGED RELATIONAL DATABASE"),
  service("api_management", "API Management", "APIM", "#7c3aed", "Integration", "API GATEWAY AND MANAGEMENT"),
  service("event_grid", "Event Grid", "EG", "#2563eb", "Integration", "EVENT ROUTING"),
  service("logic_apps", "Logic Apps", "LA", "#2563eb", "Integration", "WORKFLOW AUTOMATION"),
  service("service_bus", "Service Bus", "SB", "#7c3aed", "Integration", "ENTERPRISE MESSAGING"),
  service("signalr_service", "Azure SignalR Service", "SIG", "#2563eb", "Integration", "REAL TIME WEB MESSAGING"),
  service("communication_services", "Communication Services", "ACS", "#2563eb", "Integration", "VOICE VIDEO AND CHAT"),
  service("entra_domain_services", "Entra Domain Services", "DS", "#2563eb", "Identity", "MANAGED DOMAIN SERVICES"),
  service("entra_external_id", "Entra External ID", "EXT", "#7c3aed", "Identity", "CUSTOMER IDENTITIES"),
  service("entra_id", "Microsoft Entra ID", "ENTRA", "#2563eb", "Identity", "IDENTITY AND ACCESS"),
  service("managed_identity", "Managed Identities", "MI", "#16a34a", "Identity", "WORKLOAD IDENTITY"),
  service("key_vault", "Key Vault", "KV", "#7c3aed", "Security", "SECRETS KEYS AND CERTIFICATES"),
  service("defender_cloud", "Defender for Cloud", "MDC", "#2563eb", "Security", "CLOUD SECURITY POSTURE"),
  service("sentinel", "Microsoft Sentinel", "SENT", "#7c3aed", "Security", "CLOUD NATIVE SIEM"),
  service("ddos_protection", "DDoS Protection", "DDOS", "#dc2626", "Security", "NETWORK ATTACK PROTECTION"),
  service("bastion", "Azure Bastion", "BAS", "#2563eb", "Networking", "SECURE VM ACCESS"),
  service("cdn", "Azure CDN", "CDN", "#0284c7", "Networking", "CONTENT DELIVERY"),
  service("dns", "Azure DNS", "DNS", "#2563eb", "Networking", "DOMAIN NAME HOSTING"),
  service("expressroute", "ExpressRoute", "ER", "#7c3aed", "Networking", "PRIVATE WAN CONNECTIVITY"),
  service("firewall", "Azure Firewall", "FW", "#dc2626", "Networking", "MANAGED NETWORK FIREWALL"),
  service("front_door", "Front Door", "FD", "#2563eb", "Networking", "GLOBAL APPLICATION DELIVERY"),
  service("load_balancer", "Load Balancer", "LB", "#2563eb", "Networking", "LAYER 4 LOAD BALANCING"),
  service("nat_gateway", "NAT Gateway", "NAT", "#0284c7", "Networking", "OUTBOUND CONNECTIVITY"),
  service("network_security_group", "Network Security Group", "NSG", "#dc2626", "Networking", "NETWORK ACCESS CONTROL"),
  service("private_endpoint", "Private Endpoint", "PE", "#16a34a", "Networking", "PRIVATE SERVICE ACCESS"),
  service("public_ip", "Public IP", "PIP", "#0284c7", "Networking", "PUBLIC IP ADDRESS"),
  service("route_table", "Route Table", "UDR", "#2563eb", "Networking", "CUSTOM NETWORK ROUTING"),
  service("subnet", "Subnet", "SNET", "#0284c7", "Networking", "VIRTUAL NETWORK SEGMENT"),
  service("traffic_manager", "Traffic Manager", "TM", "#2563eb", "Networking", "DNS TRAFFIC ROUTING"),
  service("virtual_network", "Virtual Network", "VNET", "#2563eb", "Networking", "PRIVATE CLOUD NETWORK"),
  service("vpn_gateway", "VPN Gateway", "VPN", "#7c3aed", "Networking", "ENCRYPTED HYBRID CONNECTIVITY"),
  service("application_gateway", "Application Gateway", "AGW", "#2563eb", "Networking", "WEB TRAFFIC LOAD BALANCER"),
  service("backup_vault", "Backup Vault", "BKP", "#16a34a", "Storage", "CLOUD DATA PROTECTION"),
  service("data_box", "Azure Data Box", "BOX", "#2563eb", "Storage", "OFFLINE DATA TRANSFER"),
  service("disk_storage", "Disk Storage", "DISK", "#2563eb", "Storage", "BLOCK STORAGE"),
  service("files", "Azure Files", "FILE", "#0284c7", "Storage", "MANAGED FILE SHARES"),
  service("netapp_files", "Azure NetApp Files", "ANF", "#2563eb", "Storage", "ENTERPRISE FILE STORAGE"),
  service("storage_account", "Storage Account", "ST", "#16a34a", "Storage", "DATA LAKE AND OBJECT STORAGE"),
  service("iot_hub", "IoT Hub", "IOT", "#2563eb", "Internet of Things", "DEVICE MESSAGING"),
  service("digital_twins", "Digital Twins", "ADT", "#7c3aed", "Internet of Things", "CONNECTED ENVIRONMENT MODELS"),
  service("iot_central", "IoT Central", "IOTC", "#0284c7", "Internet of Things", "IOT APPLICATION PLATFORM"),
  service("maps", "Azure Maps", "MAP", "#16a34a", "Internet of Things", "GEOSPATIAL SERVICES"),
  service("open_datasets", "Azure Open Datasets", "DATA", "#2563eb", "AI + Machine Learning", "CURATED MACHINE LEARNING DATASETS"),
  service("foundry_tools", "Foundry Tools", "TOOLS", "#7c3aed", "AI + Machine Learning", "AI TOOLS AND APIS"),
  service("video_indexer", "Azure AI Video Indexer", "VID", "#7c3aed", "AI + Machine Learning", "AUDIO AND VIDEO INSIGHTS"),
  service("custom_vision", "Azure AI Custom Vision", "CV", "#7c3aed", "AI + Machine Learning", "CUSTOM VISION MODELS"),
  service("data_science_vm", "Data Science Virtual Machines", "DSVM", "#2563eb", "AI + Machine Learning", "PRECONFIGURED AI DEVELOPMENT"),
  service("metrics_advisor", "Azure AI Metrics Advisor", "MET", "#7c3aed", "AI + Machine Learning", "METRIC ANOMALY MONITORING"),
  service("personalizer", "Azure AI Personalizer", "PERS", "#7c3aed", "AI + Machine Learning", "PERSONALIZED USER EXPERIENCES"),
  service("health_bot", "Health Bot", "HB", "#2563eb", "AI + Machine Learning", "HEALTHCARE VIRTUAL ASSISTANTS"),
  service("anomaly_detector", "AI Anomaly Detector", "ANOM", "#7c3aed", "AI + Machine Learning", "ANOMALY DETECTION"),
  service("foundry_models", "Foundry Models", "FM", "#7c3aed", "AI + Machine Learning", "AI MODEL CATALOG"),
  service("security_copilot", "Microsoft Security Copilot", "SC", "#7c3aed", "AI + Machine Learning", "GENERATIVE AI SECURITY"),
  service("immersive_reader", "Azure AI Immersive Reader", "IR", "#2563eb", "AI + Machine Learning", "READING ACCESSIBILITY"),
  service("phi_models", "Phi Open Models", "PHI", "#7c3aed", "AI + Machine Learning", "SMALL LANGUAGE MODELS"),
  service("content_understanding", "Azure Content Understanding", "CU", "#7c3aed", "AI + Machine Learning", "MULTIMODAL CONTENT EXTRACTION"),
  service("planetary_computer", "Microsoft Planetary Computer Pro", "PCP", "#16a34a", "AI + Machine Learning", "GEOSPATIAL DATA AND AI"),
  service("foundry_agent_service", "Foundry Agent Service", "AGENT", "#7c3aed", "AI + Machine Learning", "MANAGED AI AGENTS"),
  service("sre_agent", "Azure SRE Agent", "SRE", "#7c3aed", "AI + Machine Learning", "AI INCIDENT RESPONSE"),
  service("foundry_observability", "Foundry Observability", "OBS", "#7c3aed", "AI + Machine Learning", "AI APPLICATION OBSERVABILITY"),
  service("foundry_iq", "Foundry IQ", "IQ", "#7c3aed", "AI + Machine Learning", "AGENT KNOWLEDGE GROUNDING"),
  service("foundry_control_plane", "Foundry Control Plane", "FCP", "#7c3aed", "AI + Machine Learning", "AI GOVERNANCE CONTROL PLANE"),
  service("data_lake_storage", "Azure Data Lake Storage", "ADLS", "#0284c7", "Analytics", "ANALYTICS DATA LAKE"),
  service("data_share", "Azure Data Share", "SHARE", "#2563eb", "Analytics", "SECURE DATA SHARING"),
  service("data_catalog", "Data Catalog", "CAT", "#2563eb", "Analytics", "ENTERPRISE DATA CATALOG"),
  service("data_lake_analytics", "Data Lake Analytics", "DLA", "#2563eb", "Analytics", "DISTRIBUTED DATA ANALYTICS"),
  service("graph_data_connect", "Microsoft Graph Data Connect", "GDC", "#2563eb", "Analytics", "MICROSOFT 365 DATA CONNECTOR"),
  service("chaos_studio", "Azure Chaos Studio", "CHAOS", "#e11d48", "Analytics", "RESILIENCE FAULT INJECTION"),
  service("fabric", "Microsoft Fabric", "FAB", "#7c3aed", "Analytics", "UNIFIED DATA PLATFORM"),
  service("purview", "Microsoft Purview", "PUR", "#7c3aed", "Analytics", "DATA GOVERNANCE"),
  service("power_bi", "Power BI", "PBI", "#eab308", "Analytics", "BUSINESS INTELLIGENCE"),
  service("compute_fleet", "Azure Compute Fleet", "FLEET", "#2563eb", "Compute", "COMPUTE CAPACITY AT SCALE"),
  service("quantum", "Azure Quantum", "Q", "#7c3aed", "Compute", "QUANTUM COMPUTING"),
  service("spot_virtual_machine", "Azure Spot Virtual Machines", "SPOT", "#2563eb", "Compute", "INTERRUPTIBLE COMPUTE"),
  service("cloud_services", "Cloud Services", "CS", "#2563eb", "Compute", "CLASSIC CLOUD APPLICATIONS"),
  service("linux_virtual_machine", "Linux Virtual Machines", "LVM", "#2563eb", "Compute", "LINUX COMPUTE"),
  service("sql_virtual_machine", "SQL Server on Azure Virtual Machines", "SQLVM", "#0891b2", "Compute", "SQL SERVER ON IaaS"),
  service("static_web_apps", "Static Web Apps", "SWA", "#e11d48", "Web", "STATIC FULL STACK WEB APPS"),
  service("windows_server", "Windows Server", "WIN", "#2563eb", "Compute", "WINDOWS SERVER WORKLOADS"),
  service("vm_image_builder", "Azure VM Image Builder", "AIB", "#2563eb", "Compute", "AUTOMATED VM IMAGES"),
  service("nutanix_cloud_clusters", "Nutanix Cloud Clusters", "NC2", "#2563eb", "Compute", "NUTANIX ON AZURE"),
  service("azure_linux", "Azure Linux", "AZL", "#2563eb", "Compute", "MICROSOFT MAINTAINED LINUX"),
  service("kubernetes_fleet_manager", "Azure Kubernetes Fleet Manager", "KFM", "#7c3aed", "Containers", "MULTI-CLUSTER MANAGEMENT"),
  service("red_hat_openshift", "Azure Red Hat OpenShift", "ARO", "#dc2626", "Containers", "MANAGED OPENSHIFT"),
  service("container_storage", "Azure Container Storage", "ACS", "#7c3aed", "Containers", "PERSISTENT CONTAINER VOLUMES"),
  service("documentdb", "Azure DocumentDB", "DOCDB", "#2563eb", "Databases", "MONGODB-COMPATIBLE DATABASE"),
  service("azure_sql", "Azure SQL", "AZSQL", "#0891b2", "Databases", "AZURE SQL PRODUCT FAMILY"),
  service("database_migration_service", "Azure Database Migration Service", "DMS", "#2563eb", "Migration", "DATABASE MIGRATION"),
  service("managed_cassandra", "Azure Managed Instance for Apache Cassandra", "CAS", "#2563eb", "Databases", "MANAGED CASSANDRA"),
  service("table_storage", "Table Storage", "TABLE", "#0284c7", "Databases", "NOSQL KEY VALUE STORAGE"),
  service("confidential_ledger", "Azure Confidential Ledger", "ACL", "#7c3aed", "Databases", "TAMPER-PROOF LEDGER"),
  service("horizondb", "Azure HorizonDB", "HDB", "#2563eb", "Databases", "CLOUD DATABASE PLATFORM"),
  service("devtest_labs", "Azure DevTest Labs", "DTL", "#2563eb", "Developer Tools", "DEVELOPMENT TEST ENVIRONMENTS"),
  service("azure_pipelines", "Azure Pipelines", "PIPE", "#2563eb", "Developer Tools", "CONTINUOUS DELIVERY"),
  service("azure_sdks", "Azure SDKs", "SDK", "#2563eb", "Developer Tools", "AZURE CLIENT LIBRARIES"),
  service("visual_studio", "Visual Studio", "VS", "#7c3aed", "Developer Tools", "APPLICATION DEVELOPMENT IDE"),
  service("visual_studio_code", "Visual Studio Code", "VSC", "#2563eb", "Developer Tools", "CODE EDITOR"),
  service("app_testing", "Azure App Testing", "TEST", "#e11d48", "Developer Tools", "APPLICATION TESTING"),
  service("deployment_environments", "Azure Deployment Environments", "ADE", "#2563eb", "Developer Tools", "DEVELOPER INFRASTRUCTURE ENVIRONMENTS"),
  service("playwright_testing", "Microsoft Playwright Testing", "PWT", "#16a34a", "Developer Tools", "MANAGED BROWSER TESTING"),
  service("artifact_signing", "Artifact Signing", "SIGN", "#7c3aed", "Developer Tools", "TRUSTED CODE SIGNING"),
  service("azure_artifacts", "Azure Artifacts", "ART", "#2563eb", "DevOps", "PACKAGE MANAGEMENT"),
  service("azure_boards", "Azure Boards", "BOARD", "#2563eb", "DevOps", "WORK ITEM TRACKING"),
  service("azure_repos", "Azure Repos", "REPO", "#2563eb", "DevOps", "GIT REPOSITORIES"),
  service("azure_test_plans", "Azure Test Plans", "ATP", "#2563eb", "DevOps", "TEST MANAGEMENT"),
  service("devops_integrations", "DevOps Tool Integrations", "INT", "#2563eb", "DevOps", "DEVOPS INTEGRATIONS"),
  service("github_advanced_security_ado", "GitHub Advanced Security for Azure DevOps", "GHAS", "#171717", "DevOps", "DEVOPS CODE SECURITY"),
  service("github_enterprise", "GitHub Enterprise", "GHE", "#171717", "DevOps", "ENTERPRISE SOFTWARE DELIVERY"),
  service("github_advanced_security", "GitHub Advanced Security", "GHAS", "#171717", "DevOps", "APPLICATION SECURITY"),
  service("github_copilot", "GitHub Copilot", "GHC", "#171717", "DevOps", "AI PAIR PROGRAMMING"),
  service("iot_edge", "Azure IoT Edge", "EDGE", "#2563eb", "Hybrid + Multicloud", "EDGE DEVICE COMPUTE"),
  service("azure_local", "Azure Local", "LOCAL", "#2563eb", "Hybrid + Multicloud", "DISTRIBUTED INFRASTRUCTURE"),
  service("stack_hub", "Azure Stack Hub", "ASH", "#2563eb", "Hybrid + Multicloud", "AZURE IN DATACENTERS"),
  service("stack_edge", "Azure Stack Edge", "ASE", "#2563eb", "Hybrid + Multicloud", "EDGE APPLIANCE"),
  service("operator_service_manager", "Azure Operator Service Manager", "OSM", "#2563eb", "Hybrid + Multicloud", "OPERATOR SERVICE LIFECYCLE"),
  service("operator_nexus", "Azure Operator Nexus", "NEX", "#2563eb", "Hybrid + Multicloud", "CARRIER-GRADE HYBRID PLATFORM"),
  service("entra_verified_id", "Microsoft Entra Verified ID", "VID", "#7c3aed", "Identity", "VERIFIABLE CREDENTIALS"),
  service("health_data_services", "Azure Health Data Services", "FHIR", "#2563eb", "Integration", "HEALTH DATA PLATFORM"),
  service("web_pubsub", "Azure Web PubSub", "WPS", "#2563eb", "Integration", "REAL TIME WEB MESSAGING"),
  service("energy_data_services", "Microsoft Energy Data Services", "EDS", "#16a34a", "Integration", "ENERGY DATA PLATFORM"),
  service("iot_operations", "Azure IoT Operations", "IOTO", "#2563eb", "Internet of Things", "EDGE IOT OPERATIONS"),
  service("notification_hubs", "Notification Hubs", "NH", "#2563eb", "Internet of Things", "MOBILE PUSH NOTIFICATIONS"),
  service("windows_iot", "Windows for IoT", "WIOT", "#2563eb", "Internet of Things", "WINDOWS IOT PLATFORM"),
  service("azure_sphere", "Azure Sphere", "SPH", "#2563eb", "Internet of Things", "SECURED MCU PLATFORM"),
  service("azure_copilot", "Azure Copilot", "COP", "#7c3aed", "Management + Governance", "AI CLOUD OPERATIONS"),
  service("external_attack_surface_management", "Defender External Attack Surface Management", "EASM", "#dc2626", "Management + Governance", "EXTERNAL ATTACK SURFACE"),
  service("azure_backup", "Azure Backup", "BACK", "#16a34a", "Management + Governance", "CLOUD BACKUP"),
  service("blueprints", "Azure Blueprints", "BP", "#7c3aed", "Management + Governance", "GOVERNED ENVIRONMENT TEMPLATES"),
  service("lighthouse", "Azure Lighthouse", "LH", "#2563eb", "Management + Governance", "CROSS-TENANT MANAGEMENT"),
  service("azure_migrate", "Azure Migrate", "MIG", "#2563eb", "Migration", "MIGRATION DISCOVERY AND ASSESSMENT"),
  service("resource_manager", "Azure Resource Manager", "ARM", "#2563eb", "Management + Governance", "RESOURCE CONTROL PLANE"),
  service("arm_templates", "Azure Resource Manager Templates", "ARM", "#2563eb", "Management + Governance", "DECLARATIVE AZURE TEMPLATES"),
  service("site_recovery", "Azure Site Recovery", "ASR", "#16a34a", "Migration", "DISASTER RECOVERY"),
  service("cloud_shell", "Cloud Shell", "SH", "#2563eb", "Management + Governance", "BROWSER CLOUD CLI"),
  service("network_watcher", "Azure Network Watcher", "NW", "#2563eb", "Management + Governance", "NETWORK MONITORING"),
  service("automanage", "Azure Automanage", "AUTO", "#2563eb", "Management + Governance", "MACHINE OPERATIONS"),
  service("resource_mover", "Azure Resource Mover", "MOVE", "#2563eb", "Migration", "CROSS-REGION RESOURCE MOVE"),
  service("update_manager", "Azure Update Manager", "UPD", "#2563eb", "Management + Governance", "MACHINE UPDATE MANAGEMENT"),
  service("storage_mover", "Azure Storage Mover", "STM", "#2563eb", "Migration", "STORAGE DATA MIGRATION"),
  service("route_server", "Azure Route Server", "ARS", "#2563eb", "Networking", "DYNAMIC NETWORK ROUTING"),
  service("web_application_firewall", "Azure Web Application Firewall", "WAF", "#dc2626", "Networking", "WEB APPLICATION PROTECTION"),
  service("network_function_manager", "Azure Network Function Manager", "NFM", "#2563eb", "Networking", "NETWORK FUNCTION LIFECYCLE"),
  service("virtual_network_manager", "Azure Virtual Network Manager", "AVNM", "#2563eb", "Networking", "CENTRAL NETWORK MANAGEMENT"),
  service("private_link", "Azure Private Link", "PL", "#16a34a", "Networking", "PRIVATE SERVICE CONNECTIVITY"),
  service("firewall_manager", "Azure Firewall Manager", "FWM", "#dc2626", "Networking", "CENTRAL FIREWALL MANAGEMENT"),
  service("virtual_wan", "Azure Virtual WAN", "VWAN", "#7c3aed", "Networking", "GLOBAL TRANSIT NETWORK"),
  service("cloud_hsm", "Azure Cloud HSM", "HSM", "#7c3aed", "Security", "DEDICATED HARDWARE SECURITY MODULE"),
  service("information_protection", "Azure Information Protection", "AIP", "#7c3aed", "Security", "DATA CLASSIFICATION AND PROTECTION"),
  service("azure_attestation", "Microsoft Azure Attestation", "MAA", "#7c3aed", "Security", "TRUSTED ENVIRONMENT ATTESTATION"),
  service("archive_storage", "Archive Storage", "ARC", "#0284c7", "Storage", "LOW COST ARCHIVE TIER"),
  service("managed_lustre", "Azure Managed Lustre", "LUS", "#0284c7", "Storage", "HIGH PERFORMANCE FILE SYSTEM"),
  service("storage_actions", "Azure Storage Actions", "ACT", "#0284c7", "Storage", "SERVERLESS STORAGE OPERATIONS"),
  service("blob_storage", "Azure Blob Storage", "BLOB", "#0284c7", "Storage", "OBJECT STORAGE"),
  service("elastic_san", "Azure Elastic SAN", "SAN", "#0284c7", "Storage", "CLOUD SAN STORAGE"),
  service("queue_storage", "Queue Storage", "QUEUE", "#0284c7", "Storage", "DURABLE MESSAGE QUEUES"),
  service("storage_explorer", "Storage Explorer", "EXP", "#0284c7", "Storage", "STORAGE MANAGEMENT TOOL"),
  service("storage_discovery", "Azure Storage Discovery", "DISC", "#0284c7", "Storage", "STORAGE ESTATE INSIGHTS"),
  service("lab_services", "Azure Lab Services", "LAB", "#2563eb", "Virtual Desktop Infrastructure", "MANAGED CLASSROOM LABS"),
  service("fluid_relay", "Azure Fluid Relay", "FLUID", "#2563eb", "Web", "REAL TIME COLLABORATION"),
];

const SERVICE_TYPES = new Set(SKETCH_SERVICES.map((service) => service.type));

function service(
  type: string,
  title: string,
  short: string,
  color: string,
  category: string,
  description: string,
) {
  return { type, title, short, color, category, description };
}

function parameter(
  key: string,
  label: string,
  type: SketchParameterDefinition["type"],
  defaultValue: SketchParameterValue,
  options?: string[],
  min?: number,
  max?: number,
  step?: number,
): SketchParameterDefinition {
  return { key, label, type, defaultValue, options, min, max, step };
}

export function normalizeInfraSketch(input: unknown): InfraSketch {
  if (!input || typeof input !== "object") {
    throw new Error("Infrastructure sketch must be an object.");
  }
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.connections)) {
    throw new Error("Infrastructure sketch requires nodes and connections.");
  }
  const nodes = value.nodes.map((item, index) => normalizeNode(item, index));
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) {
    throw new Error("Infrastructure sketch node IDs must be unique.");
  }
  const connections = value.connections.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Connection ${index + 1} must be an object.`);
    }
    const entry = item as Record<string, unknown>;
    const source = String(entry.source ?? "");
    const target = String(entry.target ?? "");
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) {
      throw new Error(`Connection ${index + 1} must link two different nodes.`);
    }
    return {
      id: cleanId(String(entry.id ?? `connection-${index + 1}`)),
      source,
      target,
      ...(entry.bidirectional === true ? { bidirectional: true } : {}),
    };
  });
  return { version: 1, nodes, connections };
}

export function generateTerraformFromSketch(
  sketch: InfraSketch,
  terraformVersion = ">= 1.5.0, < 2.0.0",
): string {
  const normalized = normalizeInfraSketch(sketch);
  if (normalized.nodes.length === 0) {
    throw new Error("Add at least one Azure service before generating Terraform.");
  }
  const context = createContext(normalized);
  const needsClientConfig = normalized.nodes.some((node) =>
    ["key_vault", "sql_server"].includes(node.serviceType),
  );
  const kubernetesCluster = normalized.nodes.find(
    (node) => node.serviceType === "kubernetes_service",
  );
  const needsKubernetesProvider =
    kubernetesCluster !== undefined &&
    normalized.nodes.some(
      (node) => node.serviceType === "kubernetes_namespace",
    );
  const generatedResourceGroup = context.resourceGroup
    ? []
    : [
        'resource "azurerm_resource_group" "sketch" {',
        '  name     = "rg-cloud-canvas"',
        `  location = ${JSON.stringify(normalized.nodes[0].region)}`,
        "  tags = {",
        '    managed_by = "terraform"',
        '    source     = "cloud-canvas"',
        "  }",
        "}",
        "",
      ];
  const clientConfig = needsClientConfig
    ? ['data "azurerm_client_config" "current" {}', ""]
    : [];
  const sections = normalized.nodes.map((node) =>
    renderNode(node, normalized, context),
  );
  const networkAssociations = renderNetworkAssociations(normalized, context);
  return [
    "# Generated by Azure IaC Guardrail: Cloud Canvas",
    "# Review names, network ranges, SKUs, and identity settings before deployment.",
    "",
    'terraform {',
    `  required_version = ${JSON.stringify(terraformVersion)}`,
    "",
    "  required_providers {",
    "    azurerm = {",
    '      source  = "hashicorp/azurerm"',
    '      version = "~> 4.0"',
    "    }",
    ...(needsKubernetesProvider
      ? [
          "    kubernetes = {",
          '      source  = "hashicorp/kubernetes"',
          '      version = "~> 2.0"',
          "    }",
        ]
      : []),
    "  }",
    "}",
    "",
    'provider "azurerm" {',
    "  features {}",
    "}",
    "",
    ...(needsKubernetesProvider
      ? kubernetesProvider(
          context.labels.get(kubernetesCluster.id) as string,
        )
      : []),
    ...generatedResourceGroup,
    ...clientConfig,
    ...sections,
    ...networkAssociations,
  ].join("\n");
}

function normalizeNode(input: unknown, index: number): SketchNode {
  if (!input || typeof input !== "object") {
    throw new Error(`Node ${index + 1} must be an object.`);
  }
  const value = input as Record<string, unknown>;
  const serviceType = String(value.serviceType ?? "") as SketchServiceType;
  if (!SERVICE_TYPES.has(serviceType)) {
    throw new Error(`Node ${index + 1} has an unsupported Azure service.`);
  }
  const name = String(value.name ?? "").trim();
  const region = String(value.region ?? "uksouth")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "");
  if (!name) {
    throw new Error(`Node ${index + 1} requires a resource name.`);
  }
  return {
    id: cleanId(String(value.id ?? `node-${index + 1}`)),
    serviceType,
    name,
    region,
    x: finiteNumber(value.x, 80),
    y: finiteNumber(value.y, 80),
    parameters: normalizeParameters(value.parameters),
  };
}

function normalizeParameters(
  input: unknown,
): Record<string, SketchParameterValue> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }
  const result: Record<string, SketchParameterValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function createContext(sketch: InfraSketch): {
  labels: Map<string, string>;
  resourceGroup?: SketchNode;
} {
  const labels = new Map<string, string>();
  const used = new Set<string>();
  for (const node of sketch.nodes) {
    const base = terraformLabel(node.name || node.serviceType);
    let label = base;
    let suffix = 2;
    while (used.has(label)) {
      label = `${base}_${suffix++}`;
    }
    used.add(label);
    labels.set(node.id, label);
  }
  return {
    labels,
    resourceGroup: sketch.nodes.find(
      (node) => node.serviceType === "resource_group",
    ),
  };
}

function renderNode(
  node: SketchNode,
  sketch: InfraSketch,
  context: ReturnType<typeof createContext>,
): string {
  const label = context.labels.get(node.id) as string;
  const rgReference = context.resourceGroup
    ? `azurerm_resource_group.${context.labels.get(context.resourceGroup.id)}.name`
    : "azurerm_resource_group.sketch.name";
  const locationReference = context.resourceGroup
    ? `azurerm_resource_group.${context.labels.get(context.resourceGroup.id)}.location`
    : "azurerm_resource_group.sketch.location";
  const dependsOn = renderDependsOn(node, sketch, context.labels);
  const tags = `  tags = {\n    managed_by = "terraform"\n    source     = "cloud-canvas"\n  }`;

  switch (node.serviceType) {
    case "resource_group":
      return block("azurerm_resource_group", label, [
        `  name     = ${JSON.stringify(node.name)}`,
        `  location = ${JSON.stringify(node.region)}`,
        tags,
        dependsOn,
      ]);
    case "virtual_network":
      return block("azurerm_virtual_network", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        `  address_space       = [${JSON.stringify(parameterString(node, "addressSpace", "10.0.0.0/16"))}]`,
        tags,
        dependsOn,
      ]);
    case "subnet": {
      const vnet = connectedNode(node, sketch, "virtual_network") ??
        sketch.nodes.find((candidate) => candidate.serviceType === "virtual_network");
      if (!vnet) {
        return commentOnly(node, "Add and connect a Virtual Network before generating this subnet.");
      }
      return block("azurerm_subnet", label, [
        `  name                 = ${JSON.stringify(node.name)}`,
        `  resource_group_name  = ${rgReference}`,
        `  virtual_network_name = azurerm_virtual_network.${context.labels.get(vnet.id)}.name`,
        `  address_prefixes     = [${JSON.stringify(parameterString(node, "addressPrefix", "10.0.1.0/24"))}]`,
        dependsOn,
      ]);
    }
    case "network_security_group":
      return block("azurerm_network_security_group", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        tags,
        dependsOn,
      ]);
    case "storage_account":
      return block("azurerm_storage_account", label, [
        `  name                            = ${JSON.stringify(storageName(node.name))}`,
        `  location                        = ${locationReference}`,
        `  resource_group_name             = ${rgReference}`,
        `  account_tier                    = ${JSON.stringify(parameterString(node, "accountTier", "Standard"))}`,
        `  account_replication_type        = ${JSON.stringify(parameterString(node, "replicationType", "LRS"))}`,
        `  public_network_access_enabled   = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
        `  shared_access_key_enabled       = ${parameterBoolean(node, "sharedAccessKey", false)}`,
        `  min_tls_version                 = ${JSON.stringify(parameterString(node, "minimumTlsVersion", "TLS1_2"))}`,
        `  allow_nested_items_to_be_public = ${parameterBoolean(node, "allowBlobPublicAccess", false)}`,
        tags,
        dependsOn,
      ]);
    case "key_vault":
      return block("azurerm_key_vault", label, [
        `  name                       = ${JSON.stringify(truncateName(node.name, 24))}`,
        `  location                   = ${locationReference}`,
        `  resource_group_name        = ${rgReference}`,
        "  tenant_id                  = data.azurerm_client_config.current.tenant_id",
        `  sku_name                   = ${JSON.stringify(parameterString(node, "skuName", "standard"))}`,
        `  enable_rbac_authorization  = ${parameterBoolean(node, "rbacAuthorization", true)}`,
        `  public_network_access_enabled = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
        `  purge_protection_enabled   = ${parameterBoolean(node, "purgeProtection", true)}`,
        tags,
        dependsOn,
      ]);
    case "service_plan":
      return block("azurerm_service_plan", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        `  os_type             = ${JSON.stringify(parameterString(node, "osType", "Linux"))}`,
        `  sku_name            = ${JSON.stringify(parameterString(node, "skuName", "P1v3"))}`,
        tags,
        dependsOn,
      ]);
    case "web_app": {
      const plan = connectedNode(node, sketch, "service_plan") ??
        sketch.nodes.find((candidate) => candidate.serviceType === "service_plan");
      if (!plan) {
        return commentOnly(node, "Add and connect an App Service Plan before generating this web app.");
      }
      return block("azurerm_linux_web_app", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        `  service_plan_id     = azurerm_service_plan.${context.labels.get(plan.id)}.id`,
        `  https_only          = ${parameterBoolean(node, "httpsOnly", true)}`,
        `  public_network_access_enabled = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
        "",
        "  identity {",
        '    type = "SystemAssigned"',
        "  }",
        "",
        "  site_config {}",
        tags,
        dependsOn,
      ]);
    }
    case "kubernetes_service": {
      const subnet = connectedNode(node, sketch, "subnet");
      return block("azurerm_kubernetes_cluster", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        `  dns_prefix          = ${JSON.stringify(truncateName(parameterString(node, "dnsPrefix", node.name) || node.name, 40))}`,
        `  private_cluster_enabled = ${parameterBoolean(node, "privateCluster", true)}`,
        `  local_account_disabled = ${parameterBoolean(node, "localAccountsDisabled", true)}`,
        `  azure_policy_enabled = ${parameterBoolean(node, "azurePolicy", true)}`,
        `  oidc_issuer_enabled = ${parameterBoolean(node, "oidcIssuer", true)}`,
        `  workload_identity_enabled = ${parameterBoolean(node, "workloadIdentity", true)}`,
        "  default_node_pool {",
        '    name       = "system"',
        `    node_count = ${parameterNumber(node, "nodeCount", 3)}`,
        `    vm_size    = ${JSON.stringify(parameterString(node, "vmSize", "Standard_D4s_v5"))}`,
        ...(subnet
          ? [
              `    vnet_subnet_id = azurerm_subnet.${context.labels.get(subnet.id)}.id`,
            ]
          : []),
        "  }",
        '  identity { type = "SystemAssigned" }',
        tags,
        dependsOn,
      ]);
    }
    case "kubernetes_namespace": {
      const cluster =
        connectedNode(node, sketch, "kubernetes_service") ??
        sketch.nodes.find(
          (candidate) => candidate.serviceType === "kubernetes_service",
        );
      if (!cluster) {
        return commentOnly(
          node,
          "Add and connect an AKS cluster before generating this namespace.",
        );
      }
      return block("kubernetes_namespace", label, [
        "  metadata {",
        `    name = ${JSON.stringify(kubernetesName(node.name))}`,
        "    labels = {",
        `      "app.kubernetes.io/managed-by" = ${JSON.stringify(parameterString(node, "managedBy", "terraform"))}`,
        `      "azure-iac-guardrail/pattern"  = ${JSON.stringify(parameterString(node, "tenancyPattern", "shared-cluster"))}`,
        "    }",
        "  }",
        `  depends_on = [azurerm_kubernetes_cluster.${context.labels.get(cluster.id)}]`,
      ]);
    }
    case "sql_server":
      return block("azurerm_mssql_server", label, [
        `  name                          = ${JSON.stringify(node.name)}`,
        `  location                      = ${locationReference}`,
        `  resource_group_name           = ${rgReference}`,
        `  version                       = ${JSON.stringify(parameterString(node, "version", "12.0"))}`,
        `  public_network_access_enabled = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
        `  minimum_tls_version           = ${JSON.stringify(parameterString(node, "minimumTlsVersion", "1.2"))}`,
        "  azuread_administrator {",
        `    login_username = ${JSON.stringify(parameterString(node, "administratorLogin", "current-terraform-principal"))}`,
        "    object_id      = data.azurerm_client_config.current.object_id",
        "  }",
        tags,
        dependsOn,
      ]);
    case "sql_database": {
      const server = connectedNode(node, sketch, "sql_server") ??
        sketch.nodes.find((candidate) => candidate.serviceType === "sql_server");
      if (!server) {
        return commentOnly(node, "Add and connect a SQL Server before generating this database.");
      }
      return block("azurerm_mssql_database", label, [
        `  name      = ${JSON.stringify(node.name)}`,
        `  server_id = azurerm_mssql_server.${context.labels.get(server.id)}.id`,
        `  sku_name  = ${JSON.stringify(parameterString(node, "skuName", "S0"))}`,
        `  zone_redundant = ${parameterBoolean(node, "zoneRedundant", false)}`,
        tags,
        dependsOn,
      ]);
    }
    case "container_registry":
      return block("azurerm_container_registry", label, [
        `  name                          = ${JSON.stringify(alphaNumeric(node.name))}`,
        `  location                      = ${locationReference}`,
        `  resource_group_name           = ${rgReference}`,
        `  sku                           = ${JSON.stringify(parameterString(node, "sku", "Premium"))}`,
        `  admin_enabled                 = ${parameterBoolean(node, "adminEnabled", false)}`,
        `  public_network_access_enabled = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
        tags,
        dependsOn,
      ]);
    case "event_hubs":
      return [
        block("azurerm_eventhub_namespace", label, [
          `  name                          = ${JSON.stringify(node.name)}`,
          `  location                      = ${locationReference}`,
          `  resource_group_name           = ${rgReference}`,
          `  sku                           = ${JSON.stringify(parameterString(node, "sku", "Standard"))}`,
          `  capacity                      = ${parameterNumber(node, "capacity", 1)}`,
          `  public_network_access_enabled = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
          `  local_authentication_enabled  = ${parameterBoolean(node, "localAuthentication", false)}`,
          tags,
          dependsOn,
        ]),
        block("azurerm_eventhub", `${label}_events`, [
          `  name              = ${JSON.stringify(parameterString(node, "eventHubName", "events"))}`,
          `  namespace_id      = azurerm_eventhub_namespace.${label}.id`,
          `  partition_count   = ${parameterNumber(node, "partitionCount", 4)}`,
          `  message_retention = ${parameterNumber(node, "messageRetention", 1)}`,
        ]),
      ].join("");
    case "event_grid":
      return block("azurerm_eventgrid_topic", label, [
        `  name                          = ${JSON.stringify(node.name)}`,
        `  location                      = ${locationReference}`,
        `  resource_group_name           = ${rgReference}`,
        `  input_schema                  = ${JSON.stringify(parameterString(node, "inputSchema", "EventGridSchema"))}`,
        `  public_network_access_enabled = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
        `  local_auth_enabled            = ${parameterBoolean(node, "localAuthentication", false)}`,
        tags,
        dependsOn,
      ]);
    case "service_bus":
      return [
        block("azurerm_servicebus_namespace", label, [
          `  name                          = ${JSON.stringify(node.name)}`,
          `  location                      = ${locationReference}`,
          `  resource_group_name           = ${rgReference}`,
          `  sku                           = ${JSON.stringify(parameterString(node, "sku", "Premium"))}`,
          `  capacity                      = ${parameterNumber(node, "capacity", 1)}`,
          `  public_network_access_enabled = ${parameterBoolean(node, "publicNetworkAccess", false)}`,
          `  local_auth_enabled            = ${parameterBoolean(node, "localAuthentication", false)}`,
          tags,
          dependsOn,
        ]),
        block("azurerm_servicebus_queue", `${label}_messages`, [
          `  name         = ${JSON.stringify(parameterString(node, "queueName", "messages"))}`,
          `  namespace_id = azurerm_servicebus_namespace.${label}.id`,
          `  enable_partitioning = ${parameterBoolean(node, "partitioning", true)}`,
          `  max_size_in_megabytes = ${parameterNumber(node, "maxSizeMegabytes", 1024)}`,
        ]),
      ].join("");
    case "log_analytics":
      return block("azurerm_log_analytics_workspace", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        `  sku                 = ${JSON.stringify(parameterString(node, "sku", "PerGB2018"))}`,
        `  retention_in_days   = ${parameterNumber(node, "retentionDays", 30)}`,
        tags,
        dependsOn,
      ]);
    default:
      return commentOnly(
        node,
        "This service is included in the architecture diagram but does not yet have a generated Terraform template.",
      );
  }
}

function renderNetworkAssociations(
  sketch: InfraSketch,
  context: ReturnType<typeof createContext>,
): string[] {
  const rendered = new Set<string>();
  const associations: string[] = [];
  for (const connection of sketch.connections) {
    const source = sketch.nodes.find((node) => node.id === connection.source);
    const target = sketch.nodes.find((node) => node.id === connection.target);
    if (!source || !target) {
      continue;
    }
    const subnet =
      source.serviceType === "subnet"
        ? source
        : target.serviceType === "subnet"
          ? target
          : undefined;
    const networkSecurityGroup =
      source.serviceType === "network_security_group"
        ? source
        : target.serviceType === "network_security_group"
          ? target
          : undefined;
    if (!subnet || !networkSecurityGroup) {
      continue;
    }
    const associationKey = `${subnet.id}:${networkSecurityGroup.id}`;
    if (rendered.has(associationKey)) {
      continue;
    }
    rendered.add(associationKey);
    const subnetLabel = context.labels.get(subnet.id) as string;
    const networkSecurityGroupLabel = context.labels.get(
      networkSecurityGroup.id,
    ) as string;
    associations.push(
      block(
        "azurerm_subnet_network_security_group_association",
        `${subnetLabel}_${networkSecurityGroupLabel}`,
        [
          `  subnet_id                 = azurerm_subnet.${subnetLabel}.id`,
          `  network_security_group_id = azurerm_network_security_group.${networkSecurityGroupLabel}.id`,
        ],
      ),
    );
  }
  return associations;
}

function renderDependsOn(
  node: SketchNode,
  sketch: InfraSketch,
  labels: Map<string, string>,
): string {
  const dependencies = sketch.connections
    .filter(
      (connection) =>
        connection.source === node.id ||
        (connection.bidirectional === true && connection.target === node.id),
    )
    .map((connection) =>
      sketch.nodes.find((item) =>
        connection.source === node.id
          ? item.id === connection.target
          : item.id === connection.source,
      ),
    )
    .filter((item): item is SketchNode => item !== undefined)
    .map((item) => terraformAddress(item, labels.get(item.id) as string))
    .filter((address): address is string => address !== undefined);
  return dependencies.length > 0
    ? `  depends_on = [${[...new Set(dependencies)].join(", ")}]`
    : "";
}

function connectedNode(
  node: SketchNode,
  sketch: InfraSketch,
  serviceType: SketchServiceType,
): SketchNode | undefined {
  const connectedIds = sketch.connections.flatMap((connection) =>
    connection.source === node.id
      ? [connection.target]
      : connection.target === node.id
        ? [connection.source]
        : [],
  );
  return sketch.nodes.find(
    (candidate) =>
      connectedIds.includes(candidate.id) &&
      candidate.serviceType === serviceType,
  );
}

function terraformAddress(
  node: SketchNode,
  label: string,
): string | undefined {
  const type: Record<string, string> = {
    resource_group: "azurerm_resource_group",
    virtual_network: "azurerm_virtual_network",
    subnet: "azurerm_subnet",
    network_security_group: "azurerm_network_security_group",
    storage_account: "azurerm_storage_account",
    key_vault: "azurerm_key_vault",
    service_plan: "azurerm_service_plan",
    web_app: "azurerm_linux_web_app",
    kubernetes_service: "azurerm_kubernetes_cluster",
    kubernetes_namespace: "kubernetes_namespace",
    sql_server: "azurerm_mssql_server",
    sql_database: "azurerm_mssql_database",
    container_registry: "azurerm_container_registry",
    log_analytics: "azurerm_log_analytics_workspace",
    event_hubs: "azurerm_eventhub_namespace",
    event_grid: "azurerm_eventgrid_topic",
    service_bus: "azurerm_servicebus_namespace",
  };
  const resourceType = type[node.serviceType];
  return resourceType ? `${resourceType}.${label}` : undefined;
}

function block(type: string, label: string, lines: string[]): string {
  return [
    `resource "${type}" "${label}" {`,
    ...lines.filter((line) => line !== ""),
    "}",
    "",
  ].join("\n");
}

function commentOnly(node: SketchNode, message: string): string {
  return [
    `# ${node.name} (${node.serviceType}) was not generated.`,
    `# ${message}`,
    "",
  ].join("\n");
}

function terraformLabel(value: string): string {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return /^[a-z_]/.test(result) ? result || "resource" : `resource_${result}`;
}

function storageName(value: string): string {
  return truncateName(alphaNumeric(value).toLowerCase(), 24).padEnd(3, "0");
}

function alphaNumeric(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "");
}

function truncateName(value: string, length: number): string {
  return value.slice(0, length);
}

function parameterString(
  node: SketchNode,
  key: string,
  fallback: string,
): string {
  const value = node.parameters?.[key];
  return typeof value === "string" ? value : fallback;
}

function parameterNumber(
  node: SketchNode,
  key: string,
  fallback: number,
): number {
  const value = node.parameters?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function parameterBoolean(
  node: SketchNode,
  key: string,
  fallback: boolean,
): boolean {
  const value = node.parameters?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export interface SketchParameterDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  defaultValue: SketchParameterValue;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export const SKETCH_PARAMETER_DEFINITIONS: Record<
  string,
  SketchParameterDefinition[]
> = {
  virtual_network: [
    parameter("addressSpace", "Address space", "text", "10.0.0.0/16"),
  ],
  subnet: [
    parameter("addressPrefix", "Address prefix", "text", "10.0.1.0/24"),
  ],
  storage_account: [
    parameter("accountTier", "Account tier", "select", "Standard", ["Standard", "Premium"]),
    parameter("replicationType", "Replication type", "select", "LRS", ["LRS", "ZRS", "GRS", "GZRS"]),
    parameter("minimumTlsVersion", "Minimum TLS", "select", "TLS1_2", ["TLS1_2"]),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
    parameter("sharedAccessKey", "Shared access key", "boolean", false),
    parameter("allowBlobPublicAccess", "Allow blob public access", "boolean", false),
  ],
  key_vault: [
    parameter("skuName", "SKU", "select", "standard", ["standard", "premium"]),
    parameter("rbacAuthorization", "RBAC authorization", "boolean", true),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
    parameter("purgeProtection", "Purge protection", "boolean", true),
  ],
  service_plan: [
    parameter("osType", "Operating system", "select", "Linux", ["Linux", "Windows"]),
    parameter("skuName", "SKU", "text", "P1v3"),
  ],
  web_app: [
    parameter("httpsOnly", "HTTPS only", "boolean", true),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
  ],
  kubernetes_service: [
    parameter("dnsPrefix", "DNS prefix", "text", ""),
    parameter("privateCluster", "Private cluster", "boolean", true),
    parameter("localAccountsDisabled", "Disable local accounts", "boolean", true),
    parameter("azurePolicy", "Azure Policy", "boolean", true),
    parameter("oidcIssuer", "OIDC issuer", "boolean", true),
    parameter("workloadIdentity", "Workload identity", "boolean", true),
    parameter("nodeCount", "System node count", "number", 3, undefined, 1, 100, 1),
    parameter("vmSize", "System node VM size", "text", "Standard_D4s_v5"),
  ],
  kubernetes_namespace: [
    parameter("managedBy", "Managed-by label", "text", "terraform"),
    parameter("tenancyPattern", "Tenancy pattern label", "text", "shared-cluster"),
  ],
  sql_server: [
    parameter("version", "Server version", "select", "12.0", ["12.0"]),
    parameter("minimumTlsVersion", "Minimum TLS", "select", "1.2", ["1.2"]),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
    parameter("administratorLogin", "Entra administrator login", "text", "current-terraform-principal"),
  ],
  sql_database: [
    parameter("skuName", "SKU", "text", "S0"),
    parameter("zoneRedundant", "Zone redundant", "boolean", false),
  ],
  container_registry: [
    parameter("sku", "SKU", "select", "Premium", ["Basic", "Standard", "Premium"]),
    parameter("adminEnabled", "Admin account", "boolean", false),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
  ],
  event_hubs: [
    parameter("sku", "Namespace SKU", "select", "Standard", ["Basic", "Standard", "Premium"]),
    parameter("capacity", "Namespace capacity", "number", 1, undefined, 1, 20, 1),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
    parameter("localAuthentication", "Local authentication", "boolean", false),
    parameter("eventHubName", "Event Hub name", "text", "events"),
    parameter("partitionCount", "Partition count", "number", 4, undefined, 1, 32, 1),
    parameter("messageRetention", "Message retention days", "number", 1, undefined, 1, 7, 1),
  ],
  event_grid: [
    parameter("inputSchema", "Input schema", "select", "EventGridSchema", ["EventGridSchema", "CloudEventSchemaV1_0", "CustomEventSchema"]),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
    parameter("localAuthentication", "Local authentication", "boolean", false),
  ],
  service_bus: [
    parameter("sku", "Namespace SKU", "select", "Premium", ["Basic", "Standard", "Premium"]),
    parameter("capacity", "Messaging units", "number", 1, undefined, 1, 16, 1),
    parameter("publicNetworkAccess", "Public network access", "boolean", false),
    parameter("localAuthentication", "Local authentication", "boolean", false),
    parameter("queueName", "Queue name", "text", "messages"),
    parameter("partitioning", "Queue partitioning", "boolean", true),
    parameter("maxSizeMegabytes", "Queue max size (MB)", "number", 1024, undefined, 1024, 81920, 1024),
  ],
  log_analytics: [
    parameter("sku", "SKU", "select", "PerGB2018", ["Free", "PerGB2018", "PerNode", "Standalone"]),
    parameter("retentionDays", "Retention days", "number", 30, undefined, 30, 730, 1),
  ],
};

function kubernetesProvider(clusterLabel: string): string[] {
  return [
    'provider "kubernetes" {',
    `  host                   = azurerm_kubernetes_cluster.${clusterLabel}.kube_config[0].host`,
    `  client_certificate     = base64decode(azurerm_kubernetes_cluster.${clusterLabel}.kube_config[0].client_certificate)`,
    `  client_key             = base64decode(azurerm_kubernetes_cluster.${clusterLabel}.kube_config[0].client_key)`,
    `  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.${clusterLabel}.kube_config[0].cluster_ca_certificate)`,
    "}",
    "",
  ];
}

function kubernetesName(value: string): string {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  return result || "namespace";
}

function cleanId(value: string): string {
  const result = value.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!result) {
    throw new Error("Sketch IDs must contain letters or numbers.");
  }
  return result;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}
