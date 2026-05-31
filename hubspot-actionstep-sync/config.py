"""Configuration for the HubSpot -> ActionStep nightly sync.

Everything an operator needs to point this routine at a real form lives here.
Values marked ``TODO`` MUST be filled in (the field definitions live in the
``form_testing`` repo). The sync fails loudly rather than guessing, so a missing
or wrong mapping never silently drops data.

Secrets are NEVER stored here -- they come from the environment:
  - ZAPIER_MCP_API_KEY  Bearer token for the Zapier MCP endpoint (ActionStep)
  - HUBSPOT_TOKEN       HubSpot private-app token (Forms read scope)
"""

from __future__ import annotations

# --- HubSpot -------------------------------------------------------------

# GUID of the form whose submissions we sync.
HUBSPOT_FORM_GUID = "TODO_form_guid"

# HubSpot API host. Rarely changes.
HUBSPOT_API_BASE = "https://api.hubapi.com"

# --- ActionStep / Zapier MCP --------------------------------------------

ZAPIER_MCP_SERVER_URL = "https://mcp.zapier.com/api/v1/connect"

# Base of the ActionStep REST API for raw requests made through
# ``actionstep_api_request_beta``. The Zapier connection is already
# authenticated, so this only needs the path origin for your org/region, e.g.
#   https://ap-southeast-2.actionstep.com  (AU)  -> {base}/api/rest/...
# VERIFY against your org's API endpoint (see ActionStep "API Requests" docs).
ACTIONSTEP_API_BASE = "TODO_actionstep_api_base"

# --- Matter type selection ----------------------------------------------

# Name of the HubSpot form field whose value decides the ActionStep matter type.
MATTER_TYPE_SELECTOR_FIELD = "TODO_form_field_name"

# Map: submitted value of MATTER_TYPE_SELECTOR_FIELD -> ActionStep actionTypeId.
# Keys are matched case-insensitively after trimming whitespace.
MATTER_TYPE_MAP: dict[str, int] = {
    # "Conveyancing": 12,
    # "Estate Planning": 18,
    "TODO_form_value": 0,
}

# --- Contact mapping -----------------------------------------------------

# Map: ActionStep individual-contact parameter -> HubSpot field name.
# "email" is required (it is the dedup key). The rest are best-effort.
CONTACT_FIELD_MAP: dict[str, str] = {
    "email": "email",
    "firstName": "firstname",
    "lastName": "lastname",
    "phone": "phone",
}

# --- Matter naming -------------------------------------------------------

# HubSpot fields concatenated (in order, space-joined, blanks skipped) to form
# the new matter's name. Falls back to the contact email if all are empty.
MATTER_NAME_FIELDS: list[str] = ["firstname", "lastname"]

# --- NCE custom (data collection) fields, per matter type ----------------

# For each actionTypeId, map HubSpot field name -> ActionStep data-field NAME.
# Field *names* (not IDs) go here -- the sync discovers the per-matter
# CustomFieldValueId at runtime, which is what lets different matter types carry
# different NCE fields without hardcoding IDs.
#
# Example:
#   NCE_FIELD_MAP = {
#       12: {  # Conveyancing
#           "property_address": "Property Address",
#           "purchase_price":   "Purchase Price",
#       },
#   }
NCE_FIELD_MAP: dict[int, dict[str, str]] = {
    0: {
        "TODO_hubspot_field": "TODO_actionstep_data_field_name",
    },
}
