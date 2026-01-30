

# Plan: Add Manual NOVA URL Input to NOVA Matching

## Problem
When the system can't find a match for someone like Trevor Dean, users have no way to manually add a NOVA URL if they know it (e.g., `https://www.itsnova.com/trevor51`).

## Solution
Add a manual URL input field that:
1. Shows a prefix indicator (`itsnova.com/`) so users know they only need the username
2. Accepts either just the username (`trevor51`) OR the full URL
3. Validates and normalizes input to ensure only valid NOVA URLs are saved
4. Includes a "Add Profile" button to confirm the manual entry

---

## Changes

### File: `src/components/callsheets/NOVAContactCard.tsx`

**Edit 1: Add state for manual URL input (~line 42)**
```typescript
const [manualUsername, setManualUsername] = useState("");
```

**Edit 2: Add Link icon import (line 2)**
```typescript
import { Check, Loader2, Users, Sparkles, User, ExternalLink, Link } from "lucide-react";
```

**Edit 3: Add handler function for manual URL submission (~line 192)**
```typescript
const handleManualUrlSubmit = async () => {
  if (!manualUsername.trim()) return;
  
  // Extract username from full URL or use as-is
  let username = manualUsername.trim();
  
  // Handle full URLs: extract username from itsnova.co or itsnova.com
  const urlMatch = username.match(/(?:https?:\/\/)?(?:www\.)?itsnova\.(?:co|com)\/([^/?#]+)/i);
  if (urlMatch) {
    username = urlMatch[1];
  }
  
  // Validate: only allow alphanumeric and basic characters
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return; // Invalid username format
  }
  
  // Build the full URL
  const profileUrl = `https://www.itsnova.com/${username}`;
  
  // Update the contact
  await supabase
    .from('crew_contacts')
    .update({ nova_profile_url: profileUrl })
    .eq('id', contactId);

  onMatch(profileUrl);
};
```

**Edit 4: Add manual URL input section after name search (~line 352)**
Add a new section with a divider and the URL input:

```tsx
{/* Divider */}
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">Or add URL manually</span>
  </div>
</div>

{/* Manual URL Input */}
<div className="space-y-3">
  <div className="relative">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center gap-1">
      <Link className="h-4 w-4" />
      <span className="text-sm">itsnova.com/</span>
    </div>
    <Input
      value={manualUsername}
      onChange={(e) => setManualUsername(e.target.value)}
      placeholder="username"
      className="pl-32 h-12 text-lg"
      onKeyDown={(e) => e.key === 'Enter' && handleManualUrlSubmit()}
    />
  </div>
  {manualUsername.trim() && (
    <Button 
      onClick={handleManualUrlSubmit}
      className="w-full bg-purple-600 hover:bg-purple-700"
    >
      <Check className="h-4 w-4 mr-2" />
      Add NOVA Profile
    </Button>
  )}
</div>
```

---

## UI Preview

```text
┌─────────────────────────────────────────┐
│           Trevor Dean                    │
│              DP                          │
├─────────────────────────────────────────┤
│      No NOVA match found                 │
│  Search manually below or skip           │
├─────────────────────────────────────────┤
│         OR SEARCH BY NAME                │
│  🔍 [ Search by name...              ]   │
├─────────────────────────────────────────┤
│        OR ADD URL MANUALLY               │
│  🔗 itsnova.com/ [ trevor51        ]     │
│  [        Add NOVA Profile         ]     │
├─────────────────────────────────────────┤
│         Skip This Person                 │
└─────────────────────────────────────────┘
```

---

## Input Handling Examples

| User Types | Extracted Username | Saved URL |
|------------|-------------------|-----------|
| `trevor51` | `trevor51` | `https://www.itsnova.com/trevor51` |
| `https://www.itsnova.com/trevor51` | `trevor51` | `https://www.itsnova.com/trevor51` |
| `itsnova.co/trevor51` | `trevor51` | `https://www.itsnova.com/trevor51` |
| `www.itsnova.com/trevor51?ref=x` | `trevor51` | `https://www.itsnova.com/trevor51` |

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 1 (`src/components/callsheets/NOVAContactCard.tsx`) |
| Lines added | ~40 |
| Validation | Regex for URL extraction + alphanumeric username check |
| Risk | Low - additive UI only |

