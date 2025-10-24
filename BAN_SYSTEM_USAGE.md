# 🔨 Leaked Liability™ - Manual Ban System

## Overview
Admin-only ban functionality with zero UI automation. No accidental bans, full audit trail, reversible with justification.

---

## 🚀 How to Ban Someone (Manual Trigger)

### Method 1: REST API (Postman/Curl)

**Endpoint:** `POST /functions/v1/admin-ban-account`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "target_user_id": "uuid-of-user-to-ban",
  "reason": "Detailed explanation: fraudulent self-reports, manipulative behavior, etc."
}
```

**Example Curl:**
```bash
curl -X POST https://blpbeopmdfahiosglomx.supabase.co/functions/v1/admin-ban-account \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "target_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "reason": "Multiple verified fraudulent accusations against legitimate producers"
  }'
```

**Success Response:**
```json
{
  "ok": true,
  "ban_id": "ban-uuid-here",
  "target_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "target_email": "user@example.com",
  "target_name": "John Doe"
}
```

---

### Method 2: Direct SQL (Backend Console)

If you prefer direct database access:

```sql
SELECT public.ban_account(
  '<target_user_uuid>',
  'Reason for ban: fraudulent self-reports, verified manipulation'
);
```

**Returns JSON with ban details.**

---

## 🔄 How to Revoke a Ban (Reinstatement)

### REST API

**Endpoint:** `POST /functions/v1/admin-revoke-ban`

**Body:**
```json
{
  "ban_id": "uuid-of-ban-record",
  "reason": "Appeal accepted: evidence verified legitimate user, false positive"
}
```

**Example:**
```bash
curl -X POST https://blpbeopmdfahiosglomx.supabase.co/functions/v1/admin-revoke-ban \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "ban_id": "ban-uuid-here",
    "reason": "Appeal approved after review - reinstating account"
  }'
```

---

## 📍 What Happens When Someone is Banned

1. **Database updates:**
   - `profiles.account_status` → `'banned'`
   - `producers.account_status` → `'banned'`
   - New record created in `account_bans` table

2. **Audit trail:**
   - `audit_logs` entry with admin ID, target user, reason, timestamp

3. **User experience:**
   - On next login attempt, user is **blocked** (you need to add login check)
   - Redirected to `/ban/{ban_id}` page showing ban message

4. **Ban page displays:**
   - Ban reason (your written explanation)
   - Timestamp of ban
   - Appeal instructions (leakedliability@gmail.com)

---

## 🛡️ Security Features

✅ **Admin-only:** RPC checks `has_role(auth.uid(), 'admin')` before executing  
✅ **Audit trail:** Every ban logged with `banned_by`, `reason`, `created_at`  
✅ **Reversible:** `revoke_ban()` function tracks who lifted the ban and why  
✅ **RLS protected:** Only admins can view all bans; users can only see their own  
✅ **No UI buttons:** Zero risk of accidental clicks — must be manually triggered

---

## 📋 Next Step: Add Login Check

You currently **do not** have automatic ban enforcement on login. You need to add this check.

### Option 1: Client-side (in App.tsx or auth context)
```typescript
useEffect(() => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('user_id', session.user.id)
        .single();
      
      if (profile?.account_status === 'banned') {
        const { data: ban } = await supabase
          .from('account_bans')
          .select('id')
          .eq('target_user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        await supabase.auth.signOut();
        navigate(`/ban/${ban.id}`);
      }
    }
  });
}, []);
```

### Option 2: Edge Function (more secure)
Create `supabase/functions/check-ban-status/index.ts` that runs on every auth request.

---

## 🗂️ Database Tables

### `account_bans`
Stores all ban records with full audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Ban record ID |
| target_user_id | UUID | Banned user |
| target_email | TEXT | Email at time of ban |
| target_display_name | TEXT | Name at time of ban |
| banned_by | UUID | Admin who issued ban |
| reason | TEXT | Explanation |
| appeal_email | TEXT | Contact for appeals |
| created_at | TIMESTAMPTZ | When ban occurred |
| revoked_at | TIMESTAMPTZ | If/when lifted |
| revoked_by | UUID | Admin who lifted ban |
| revoked_reason | TEXT | Why ban was lifted |

### `ban_pages`
Single-row table with ban message content (editable by admins).

---

## 🧪 Testing the Ban Flow

1. **Get a test user UUID:**
   ```sql
   SELECT user_id, email FROM profiles LIMIT 1;
   ```

2. **Ban them via REST API** (using Postman with your admin JWT)

3. **Check ban record:**
   ```sql
   SELECT * FROM account_bans ORDER BY created_at DESC LIMIT 1;
   ```

4. **Try to sign in as that user** → should be blocked (once you add login check)

5. **Visit `/ban/{ban_id}` directly** → should see ban page

6. **Revoke via REST API** → account_status returns to 'active'

---

## 📞 Support

Ban system questions? Contact system architect or review audit logs:
```sql
SELECT * FROM audit_logs WHERE event_type IN ('ban_account', 'revoke_ban') ORDER BY created_at DESC;
```

---

**Remember:** No UI buttons. No automation. Manual control only. Pull the trigger when ready.
