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

## Field Rules

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `source_file` | string | Yes | Original PDF filename |
| `production_info` | object | Yes | |
| `production_info.production_name` | string | Yes | Canonical production name |
| `production_info.date` | string | Yes | Job/shoot date in "Month DD, YYYY" (e.g. "June 10, 2025") |
| `production_info.company_name` | string | No | Production company if known |
| `crew_size` | number | Yes | **Tally of crew array length** — used for CREW SIZE column on leaderboard |
| `crew` | array | Yes | One object per person |

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

- `crew_size` MUST equal `crew.length`
- `production_info.date` MUST be parseable (Month DD, YYYY or M/D/YY)
