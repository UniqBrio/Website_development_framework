# Approved content and facts

**None.**

Nothing has been approved by the restaurant. An item enters here only with an approval record:
who approved it (a named person with authority at the restaurant), when (ISO date), and exactly
which value was approved. First-level reviewer feedback is recorded separately in
`../approvals/approval-register.md` §B and never counts as approval.

When an approval arrives, the engine seam record is updated in the SAME change: the draft's
`provenance` becomes `approved_ai_draft` with its `approval` record, or the fact's inventory
status becomes `verified_available` with its value. `approved/` and the seam must not disagree.

Known consequence (FD-09): approving AI draft AD-01 (proposition) under the current architecture
makes generation throw; resolve FD-09 or the architecture before recording that approval.
