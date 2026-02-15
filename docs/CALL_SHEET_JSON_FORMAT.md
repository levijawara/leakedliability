# Call Sheet JSON Format (Canonical)

**This is the canonical format for every call sheet extraction JSON.** Use this structure whenever parsing call sheets for the Project Timeline.

## Structure

```json
{
  "source_file": "Production Name M:D:YY.pdf",
  "production_info": {
    "production_name": "Production Name",
    "date": "Month DD, YYYY",
    "company_name": "Company Name (optional)"
  },
  "crew_size": 11,
  "crew": [
    {
      "name": "Full Name",
      "role": "Role/Title",
      "department": "Department",
      "phone": "(xxx) xxx-xxxx or (empty)",
      "email": "email@example.com or (empty)"
    }
  ]
}
```

**When there is no crew identity information** (call sheet omits names / crew grid), omit `crew_size` and use an empty `crew` array. Leaving crew_size blank is valid. The leaderboard will show a blank; we still record the production. Some values may be left blank.

## Field Rules

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `source_file` | string | Yes | Original PDF filename |
| `production_info` | object | Yes | |
| `production_info.production_name` | string | Yes | Canonical production name |
| `production_info.date` | string | No | Job/shoot date in "Month DD, YYYY". Omit if unknown. |
| `production_info.company_name` | string | No | Production company if known |
| `crew_size` | number | No | **Tally of crew array length** — used for CREW SIZE. **Omit or leave blank when call sheet has no crew identities.** |
| `crew` | array | Yes | One object per person. Use `[]` when no crew names are listed. |

## Crew Member Object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Full name |
| `role` | string | Yes | Role/title (e.g. "1st AC", "Producer") |
| `department` | string | Yes | Department (e.g. "Camera", "Agency/Production") |
| `phone` | string | Yes | Phone or "(empty)" |
| `email` | string | Yes | Email or "(empty)" |

## Example

```json
{
  "source_file": "Christian Combs 8:19:25.pdf",
  "production_info": {
    "production_name": "Christian Combs",
    "date": "August 19, 2025"
  },
  "crew_size": 11,
  "crew": [
    {"name": "CHRISTIAN COMBS", "role": "ARTIST/TEAM", "department": "Casting", "phone": "(empty)", "email": "(empty)"},
    {"name": "ADAM GHARIB", "role": "DIRECTOR/dop", "department": "Direction", "phone": "(empty)", "email": "(empty)"}
  ]
}
```

## Validation

- When crew identities exist: `crew_size` SHOULD equal `crew.length`
- When no crew identities: omit `crew_size` (or omit the key); use `crew: []`. Leaderboard CREW SIZE stays blank.
- `production_info.date` when present MUST be parseable (Month DD, YYYY or M/D/YY)

## No-Crew-Identity Example

Call sheets that list departments/call times but no names get empty crew and no crew_size:

```json
{
  "source_file": "Tropicana x AE CS 02:16:2026.pdf",
  "production_info": {
    "production_name": "Tropicana x AE - Rickie Fowler",
    "date": "February 16, 2026"
  },
  "crew": []
}
```
