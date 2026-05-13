# BECMI Inventory Manual QA Checklist

This checklist is for **manual testing in Foundry VTT** (not automated tests). Follow the steps in order where possible.

## Before you start

- Launch Foundry and open a world using the BECMI system.
- Open browser dev tools console so you can watch for errors during testing.
- Create at least 3 test actors:
  - `QA-New` (fresh actor)
  - `QA-Legacy` (actor meant to represent older data)
  - `QA-Partial` (actor with intentionally incomplete item data)
- If possible, perform tests in a clean world or with only essential modules enabled.

---

## 1) Actor sheet loading

### 1.1 New character with no items
**Steps**
1. Create a brand-new character (`QA-New`).
2. Open the actor sheet.

**Expected results**
- Sheet opens without errors.
- Inventory UI renders correctly.
- No items are shown except system-provided defaults (if applicable).
- No console errors.

### 1.2 Existing character with old data
**Steps**
1. Open `QA-Legacy` (an actor imported from old data or copied from older world data).
2. Navigate inventory, currency, treasure, and encumbrance sections.

**Expected results**
- Sheet opens and data is readable.
- Legacy items appear without crashing the sheet.
- Missing modern fields are handled gracefully (fallback values, no hard failures).
- No console errors.

### 1.3 Character with missing/partial item data
**Steps**
1. On `QA-Partial`, create or edit one or more items to remove non-critical fields (via JSON/source if needed).
2. Re-open the actor sheet.

**Expected results**
- Sheet still loads.
- Incomplete items are still displayed in a safe form.
- Encumbrance/currency/treasure totals still calculate with fallbacks.
- No console errors.

---

## 2) Default containers

### 2.1 Create default containers
**Steps**
1. On a test actor with no containers, run the UI action that creates default containers.

**Expected results**
- Default container set is created successfully.

### 2.2 Re-run creation without duplicates
**Steps**
1. Run the same “create default containers” action again.

**Expected results**
- No duplicate default containers are created.
- Existing defaults remain intact.

### 2.3 Verify required default names
**Steps**
1. Check the actor inventory/container list.

**Expected results**
- Exactly one of each expected default exists:
  - Belt Pouch
  - Worn Items
  - Backpack
  - Sack #1
  - Sack #2

---

## 3) Item creation buttons

For each button below, test once at root level and once while a container group is selected/targeted.

- Add Equipment
- Add Weapon
- Add Armor
- Add Container
- Add Consumable
- Add Treasure
- Add Currency

### 3.1 Create items at root
**Steps**
1. Click each add button while creating at root (no specific container target).

**Expected results**
- Correct item type is created each time.
- New item appears in root inventory list.
- Actor sheet updates/re-renders immediately.
- No console errors.

### 3.2 Create items inside container groups
**Steps**
1. Select/target `Backpack` (or another container).
2. Click each add button.

**Expected results**
- Items are created with the selected container as parent.
- Items render under that container group.
- No duplicate or misplaced items appear.
- No console errors.

---

## 4) Moving items

### 4.1 Move item to Backpack
**Steps**
1. Create a root item.
2. Move it into `Backpack`.

**Expected results**
- Item leaves root and appears under Backpack.
- Encumbrance updates correctly after move.

### 4.2 Move item to Sack #1
**Steps**
1. Move an item into `Sack #1`.

**Expected results**
- Item appears under Sack #1.
- Totals remain consistent.

### 4.3 Move item to no container/root
**Steps**
1. Move a contained item back to root/no container.

**Expected results**
- Item is removed from container and appears at root.
- Encumbrance and display update immediately.

### 4.4 Attempt to move container into itself
**Steps**
1. Try to set a container’s parent to itself.

**Expected results**
- Action is rejected.
- Data remains unchanged.
- User gets safe feedback (or silent no-op), and no console errors.

### 4.5 Attempt obvious circular containment
**Steps**
1. Put Container A inside Container B.
2. Attempt to put Container B inside Container A.

**Expected results**
- Circular containment is rejected/prevented.
- Existing valid containment remains intact.
- No sheet crash and no console errors.

---

## 5) Encumbrance

### 5.1 Empty actor = 0 cn
**Steps**
1. Use an actor with no items and no currency.

**Expected results**
- Encumbrance total displays `0 cn`.

### 5.2 Root item weight counts
**Steps**
1. Add a root item with known weight.

**Expected results**
- Encumbrance increases by the expected amount.

### 5.3 Contained item weight counts
**Steps**
1. Put a weighted item inside Backpack.

**Expected results**
- Item weight still contributes to total encumbrance.

### 5.4 Container own weight counts
**Steps**
1. Ensure a container has non-zero own weight.

**Expected results**
- Container’s own weight contributes to total.

### 5.5 Quantity affects weight
**Steps**
1. Set an item quantity to 1, note encumbrance.
2. Increase quantity (e.g., to 5).

**Expected results**
- Encumbrance scales appropriately with quantity.

### 5.6 Currency weight affects total
**Steps**
1. Add significant coin amounts.

**Expected results**
- Encumbrance increases according to currency weight rules.

### 5.7 Movement bracket updates correctly
**Steps**
1. Increase/decrease carried load to cross movement thresholds.

**Expected results**
- Movement bracket/band updates to the correct value after each threshold crossing.

---

## 6) Currency

### 6.1 Add/edit cp, sp, ep, gp, pp
**Steps**
1. Set each denomination to known values.
2. Edit them again.

**Expected results**
- Values persist correctly on sheet refresh/reopen.
- No denomination is lost or overwritten incorrectly.

### 6.2 Confirm no accidental duplicates through helpers
**Steps**
1. Use any helper action related to currency creation/normalization repeatedly.

**Expected results**
- Only one currency entry/state per denomination exists.
- Re-running helper logic does not duplicate currency records.

### 6.3 Confirm total gp value
**Steps**
1. Enter a mixed set of coin values with a hand-calculated gp equivalent.

**Expected results**
- Displayed total gp value matches manual calculation.

### 6.4 Confirm currency weight
**Steps**
1. Add/remove large coin amounts.

**Expected results**
- Encumbrance changes match currency weight expectations.

---

## 7) Treasure

### 7.1 Add gem/jewelry/art/trade-good
**Steps**
1. Create at least one treasure item of each category (gem, jewelry, art, trade-good).

**Expected results**
- Each treasure type can be created and edited.
- Each appears in the treasure/inventory view correctly.

### 7.2 `estimatedValue` fallback
**Steps**
1. Create/edit a treasure item with missing explicit value fields where fallback should apply.

**Expected results**
- UI/calculation uses fallback `estimatedValue` behavior.
- No NaN/blank/undefined totals appear.

### 7.3 Unidentified treasure still weighs
**Steps**
1. Mark a treasure item as unidentified.

**Expected results**
- Item still contributes weight/encumbrance.

### 7.4 `identifiedOnly` total excludes unidentified treasure
**Steps**
1. Compare totals with mixed identified + unidentified treasure.

**Expected results**
- `identifiedOnly` value excludes unidentified entries.
- Identified totals remain accurate.

---

## 8) Regression checks

### 8.1 Edit item opens item sheet
**Steps**
1. Click edit on several item types.

**Expected results**
- Correct item sheet opens every time.

### 8.2 Delete item works
**Steps**
1. Delete a few items from root and from containers.

**Expected results**
- Items are removed from UI and persisted data.
- Parent container and totals update correctly.

### 8.3 Actor sheet re-renders after item creation
**Steps**
1. Create items repeatedly across several types.

**Expected results**
- Sheet updates immediately after each create.
- No stale display requiring manual refresh.

### 8.4 No console errors during ordinary use
**Steps**
1. Perform typical workflow: create, edit, move, delete, adjust currency.

**Expected results**
- No uncaught exceptions or repeated warnings related to inventory systems.

---

## Final smoke-test sequence (quick pass)

Use this as a 5–10 minute final validation after changes:

1. Open fresh actor and verify sheet loads.
2. Create default containers and confirm required names exist once each.
3. Add one of each item type (equipment/weapon/armor/container/consumable/treasure/currency).
4. Move two items into Backpack and one into Sack #1; move one back to root.
5. Set mixed currency (cp/sp/ep/gp/pp) and verify encumbrance and gp total update.
6. Add identified + unidentified treasure and verify `identifiedOnly` behavior.
7. Edit and delete at least one item.
8. Re-open actor sheet and confirm all state persists.
9. Check console remained clear of inventory-related errors.

**Smoke-test expected result:**
- All above actions complete without breakage, totals stay coherent, and no console errors occur.

---

## 10) Library Item → Actor Copy Tests

### 10.1 Equipment copy independence
**Steps**
1. Create a standalone Item in the Items sidebar named `Iron Spike` (type: Equipment).
2. Set description, quantity, stackable, weight, value, rarity, tags, notes, and identified.
3. Drag/drop `Iron Spike` onto actor sheet root.
4. Edit actor-owned copy quantity and notes.

**Expected results**
- Actor receives a new embedded Item copy.
- Actor copy edits do not mutate the source/library `Iron Spike`.
- Source item fields remain unchanged.

### 10.2 Source edits do not retroactively mutate actor copies
**Steps**
1. After step 10.1, edit the source/library `Iron Spike` item.
2. Change quantity, description, and notes on the source item.

**Expected results**
- Existing actor-owned copy remains unchanged.
- No live reference behavior is observed between source and actor item.

### 10.3 Weapon data preservation
**Steps**
1. Create a library Weapon with `damage`, `range`, and `magicalBonus` set.
2. Drop it to actor root and open actor-owned copy.

**Expected results**
- Actor-owned weapon preserves `name`, `type`, `img`, and all shared/system fields.
- Weapon-specific fields (`damage`, `range`, `magicalBonus`) are preserved.

### 10.4 Armor data preservation
**Steps**
1. Create a library Armor with `armorClass`, `shieldBonus`, and `magicalBonus`.
2. Drop onto actor.

**Expected results**
- Actor-owned armor preserves armor-specific fields and common fields.

### 10.5 Currency merge and source immutability
**Steps**
1. Ensure actor has `gp` quantity `10`.
2. Create/drop a library `gp` currency item with quantity `5`.

**Expected results**
- Actor has one `gp` row with quantity `15` (merged, not duplicated).
- `weightPerUnit` is `1` for actor-owned currency.
- Source/library currency item is unchanged.

### 10.6 Treasure value preservation
**Steps**
1. Create a library Treasure item with `treasureType` and `estimatedValue`.
2. Drop onto actor.

**Expected results**
- Actor-owned treasure preserves `treasureType`, `estimatedValue`, and shared fields.

### 10.7 Container placement and circular safety
**Steps**
1. Drop generic item on sheet root.
2. Drop generic item onto Backpack group.
3. Drop generic item onto Sack group.
4. Attempt to drop/move a container into itself.
5. Attempt to create circular A→B and B→A containment.

**Expected results**
- Root drop uses no container (`containerId` empty/normalized).
- Backpack/Sack drops resolve to the targeted container item id.
- Self/circular containment is blocked safely with warning; no crash.

### 10.8 Encumbrance after drop/edit
**Steps**
1. Drop item with weight `50` and quantity `2`.
2. Verify encumbrance increases by `100 cn`.
3. Drop `10 gp`.

**Expected results**
- Encumbrance increases by `10 cn` for currency.
- Container contents are not double-counted.

