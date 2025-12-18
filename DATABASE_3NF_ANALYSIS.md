# Database 3NF Analysis

## Tables

### users
- id (PK)
- name, email, password
- created_at

### devices
- id (PK)
- device_id (MAC, unique)
- user_id (FK → users)
- name, location, is_active
- created_at

### measurements
- id (PK)
- device_id (FK → devices)
- oxygen, co2, particles, temperature, humidity
- created_at

## 3NF Compliance

✅ **1NF**: Atomic values, no repeating groups
✅ **2NF**: No partial dependencies
✅ **3NF**: No transitive dependencies

## Verification (pgAdmin)

```sql
-- Check tables
SELECT * FROM users;
SELECT * FROM devices;
SELECT * FROM measurements ORDER BY created_at DESC LIMIT 10;

-- Check relations
SELECT d.name, m.co2, m.created_at 
FROM measurements m 
JOIN devices d ON m.device_id = d.id;
```
