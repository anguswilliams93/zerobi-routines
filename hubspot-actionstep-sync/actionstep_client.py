"""ActionStep operations over the Zapier MCP.

Connects exactly as in the supplied fastmcp example
(``StreamableHttpTransport`` + Bearer auth) and exposes the handful of
operations the sync needs. Anything Zapier doesn't expose as a first-class tool
is done through ``actionstep_api_request_beta`` (a raw, pre-authenticated HTTP
request against the ActionStep REST API).

Endpoint paths / filter operators marked ``VERIFY`` are drawn from ActionStep's
public API doc index and must be confirmed against the live org on first run --
every raw call is logged to make that a quick check.
"""

from __future__ import annotations

import json
import os
from typing import Any

from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport

import config


class ActionStepError(RuntimeError):
    pass


def _unwrap(result: Any) -> Any:
    """Zapier MCP returns content as a list of TextContent; parse the JSON text."""
    try:
        text = result.content[0].text
    except (AttributeError, IndexError) as exc:  # pragma: no cover - defensive
        raise ActionStepError(f"Unexpected MCP result shape: {result!r}") from exc
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


class ActionStepClient:
    """Async context manager wrapping a single Zapier MCP session."""

    def __init__(self, *, dry_run: bool = False, verbose: bool = False) -> None:
        api_key = os.environ.get("ZAPIER_MCP_API_KEY")
        if not api_key:
            raise ActionStepError("ZAPIER_MCP_API_KEY is not set in the environment")
        transport = StreamableHttpTransport(
            config.ZAPIER_MCP_SERVER_URL,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        self._client = Client(transport=transport)
        self.dry_run = dry_run
        self.verbose = verbose

    async def __aenter__(self) -> "ActionStepClient":
        await self._client.__aenter__()
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self._client.__aexit__(*exc)

    # -- low-level ------------------------------------------------------

    async def _call(self, tool: str, params: dict[str, Any]) -> Any:
        if self.verbose:
            print(f"    -> {tool} {json.dumps(params)[:300]}")
        result = await self._client.call_tool(tool, params)
        data = _unwrap(result)
        if self.verbose:
            print(f"    <- {json.dumps(data)[:500] if not isinstance(data, str) else data[:500]}")
        return data

    async def _raw(self, method: str, path: str, body: dict | None = None) -> Any:
        """Raw ActionStep REST call via actionstep_api_request_beta."""
        base = config.ACTIONSTEP_API_BASE.rstrip("/")
        url = f"{base}/api/rest/{path.lstrip('/')}"
        params: dict[str, Any] = {
            "instructions": "Make a raw authenticated ActionStep REST request.",
            "method": method,
            "url": url,
        }
        if body is not None:
            params["body"] = json.dumps(body)
        return await self._call("actionstep_api_request_beta", params)

    # -- contacts -------------------------------------------------------

    async def find_contact_by_email(self, email: str) -> dict | None:
        """Return the first participant matching ``email``, or None.

        VERIFY: ActionStep filters use ``<field>_eq``; the participants email
        field may be ``email`` (confirm against the live response).
        """
        data = await self._raw("GET", f"participants?email_eq={email}")
        participants = _extract_list(data, "participants")
        return participants[0] if participants else None

    async def create_individual_contact(self, fields: dict[str, Any]) -> dict:
        params = {
            "instructions": "Create an individual contact in ActionStep.",
            **fields,
        }
        if self.dry_run:
            return {"_dry_run": True, "participant": params}
        data = await self._call("actionstep_create_individual_contact", params)
        return data

    # -- matters --------------------------------------------------------

    async def create_matter(self, *, action_type_id: int, action_name: str) -> dict:
        params = {
            "instructions": "Create a new matter (action) in ActionStep.",
            "actionTypeId": str(action_type_id),
            "actionName": action_name,
            "status": "Active",
        }
        if self.dry_run:
            return {"_dry_run": True, "matter": params}
        return await self._call("actionstep_create_matter", params)

    async def link_participant(self, *, action_id: int, participant_id: int) -> Any:
        """Attach a participant to a matter.

        VERIFY: resource name ``actionparticipants`` and the link payload shape.
        """
        body = {
            "actionparticipants": {
                "links": {"action": str(action_id), "participant": str(participant_id)}
            }
        }
        if self.dry_run:
            return {"_dry_run": True, "link": body}
        return await self._raw("POST", "actionparticipants", body)

    # -- NCE custom (data collection) fields ----------------------------

    async def discover_custom_field_values(self, action_id: int) -> list[dict]:
        """Return this matter's data-collection record values.

        Each entry carries the field's name/label plus its CustomFieldValueId,
        which we then target with actionstep_update_matter_custom_field_value.

        VERIFY: resource ``datacollectionrecordvalues`` + filter ``action_eq``.
        """
        data = await self._raw(
            "GET", f"datacollectionrecordvalues?action_eq={action_id}"
        )
        return _extract_list(data, "datacollectionrecordvalues")

    async def update_custom_field_value(
        self, *, custom_field_value_id: Any, value: Any
    ) -> Any:
        params = {
            "instructions": "Update a matter custom field value.",
            "CustomFieldValueId": str(custom_field_value_id),
            "CustomFieldValue": value,
        }
        if self.dry_run:
            return {"_dry_run": True, "field": params}
        return await self._call(
            "actionstep_update_matter_custom_field_value", params
        )


def _extract_list(data: Any, key: str) -> list[dict]:
    """ActionStep wraps collections under a top-level resource key; results may
    be a single object or a list. Normalise to a list."""
    if isinstance(data, dict):
        node = data.get(key, data)
    else:
        node = data
    if node is None:
        return []
    if isinstance(node, list):
        return node
    if isinstance(node, dict):
        return [node]
    return []
