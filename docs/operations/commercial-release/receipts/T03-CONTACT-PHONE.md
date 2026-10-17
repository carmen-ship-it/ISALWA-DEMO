# Receipt — T03 change and retire a contact's phone

Fourth sub-task of remaining T03 (`T03.md` §9): "actualizar/retirar teléfono" (A2 §58; retired number per A2 §66).

## 1. Commands

Both commands take `partyId` (the customer), `contactId`, `expectedVersion`, a `reason` and, for `other`, a `reasonNote`. Reasons: `number_changed`, `entry_error`, `no_longer_belongs`, `other`.

- **`ChangeContactPhone`** also takes `newPhone` (normalized like registration), a `verificationMethod` and an optional `evidenceNote`.
  - Verification methods: `known_contact_confirmation`, `in_person`, `previously_verified_channel`, `owner_review`. None of them is "a new sender says they are X".
  - Refused: an unknown method, the same number, an invalid number, `other` without a note.
- **`RetireContactPhone`**:
  - sets `phone` to null and records `phone_retired_at` / `phone_retired_reason` (the T03 migration columns);
  - keeps the contact and the person;
  - nulling the number means every existing reader (duplicate check, sending, default selection) stops using it without auditing each one;
  - retiring when there is no number is refused.
- **Shared behavior:**
  - A WhatsApp value equal to the old number follows it (changed or cleared), shown as `whatsappFollows` on the event.
  - Authority is the customer `edit` action, the same as `UpdateContact` (`CUSTOMER_COMMAND_ACTION`), with the same non-disclosure answers.
- **Closed bypass:** `UpdateContact` on an existing contact can no longer set or change the phone (`VALIDATION_FAILED`). New contacts can still be created with a phone, and other contact fields stay editable.

## 2. History and redaction

- Events: `contact.phone.changed` (previous and new number, masked forms, reason, method, evidence note, version) and `contact.phone.retired` (retired number, masked form, reason, version).
- Audit before/after values hold `phone` and `whatsapp`.
- The customer timeline allowlist passes only the masked numbers (`•••123`), the reason, the method and the version. Full numbers and the evidence note stay out of the timeline (HTTP test asserts the digits are absent).
- os-web shows lines such as "Número: •••123 → •••456 · Motivo: Error de registro · Verificación: Confirmación presencial".

## 3. UI

`customer-edit-forms.tsx`:
- the phone field is read-only for existing contacts, with a pointer to the new form;
- "Cambiar o retirar teléfono" holds a change form (new number, verification method, reason, note, evidence note warning against personal documents) and a retire form (reason, note).

The page is lane B's `clientes/[partyId]/page.tsx`, which was not touched; the forms render where the contact edit forms already render.

## 4. Checks (evidence `evidence/T03-CONTACT-PHONE/`; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (os-api dependency graph) | exit 0 |
| Typecheck os-contracts, os-party, os-database, os-query, os-api, os-web | exit 0 each |
| New HTTP + PG `t03-contact-phone.http.test.ts` | 6/6 |
| New os-web `contact-phone.test.ts` (+ pinned self-service command list) | 3/3 (14/14 together) |
| os-api (serial) | 306/306 |
| os-database (serial) | 305/305 |
| os-query | 114/114 |
| os-contracts | 185/185 |
| os-party | 36/36 |
| os-web lib + components | 1314/1314 |

Mutations (`mutations.txt`), run inline; sources restored with sha256 verified and builds redone:

| Mutation | Caught by |
|---|---|
| `UpdateContact` phone lock removed | HTTP 1 |
| Retire keeps the number | HTTP 2 |
| Note for "Otro" not required | HTTP 4 |
| WhatsApp does not follow | HTTP 2 |
| Full number added to timeline facts | HTTP 1 |
| Web verification method not required | os-web 1 |

## 5. Status, decisions, limitations

- IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN.
- **Decisions for review:**
  - retire sets the number to null rather than keeping it with a flag;
  - WhatsApp follows only when it equals the old number;
  - shared numbers are not blocked on change (A2 §62: no global unique lock);
  - the general contact edit no longer changes phones (behavior change).
- **Not covered:**
  - WhatsApp-only changes still go through `UpdateContact` without a reason;
  - end of contact relation and preview of affected sends/commitments (A2 §66);
  - provisional conversations from a new number (A2 §62);
  - the os-web party actions still require `master_data.admin` web-side (existing `adminClient` gate), so commercial editors use the API path only, as for the other party forms.
