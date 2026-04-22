# Security Specification - HRP Tracker

## Data Invariants
1. A patient record must have a name, block, and PHC.
2. Only verified users can perform write operations.
3. Role-based access:
   - `admin`: Full access to everything.
   - `dph_officer`: Full access to patients and alerts. Read access to users.
   - `bdo`: Access to patients within their assigned `block`.
   - `viewer`: Read access to patients.

## The Dirty Dozen Payloads (Targeting PERMISSION_DENIED)
1. **Unauthenticated Read**: Attempt to read `/patients/any` without login.
2. **Identity Spoofing**: Attempt to create a patient doc and setting `createdBy` to another user's UID.
3. **Privilege Escalation**: A `bdo` user attempting to create an `admin` user in `/users`.
4. **Cross-Block Write**: A `bdo` of "Block A" attempting to update a patient in "Block B".
5. **System Field Shadowing**: Attempting to update `createdAt` after initial creation.
6. **Malicious ID injection**: Attempting to create a document with a 2KB string ID.
7. **Resource Poisoning**: Sending a 1MB string in the `n` (name) field.
8. **Invalid Enum Write**: Setting a user `role` to "GOD_MODE".
9. **Terminal State Bypass**: Attempting to "re-activate" a case that is marked as final.
10. **Array Overload**: Sending 10,000 risk flags in the `r` array.
11. **Spoofed Admin Check**: Setting `isAdmin: true` in the user profile if the rule mistakenly trusts data.
12. **Orphaned Write**: Creating a patient without a corresponding valid Block.

## Test Runner Plan
I will implement `firestore.rules` following the Eight Pillars:
- Relational sync (Master Gate)
- Validation Blueprints
- Path variable hardening
- Tiered identity logic
- Array guarding
- PII isolation
- Atomicity Guarantee
- Secure List Queries
