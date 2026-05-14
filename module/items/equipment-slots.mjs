const DEFAULT_EQUIPMENT_SLOTS = {
  armor: null, shield: null, ringLeft: null, ringRight: null, amulet: null, cloak: null, boots: null, gloves: null, belt: null, weaponMain: null, weaponOffhand: null
};

export const VALID_ITEM_EQUIP_SLOTS = [
  "armor", "shield", "helmet", "cloak", "boots", "gloves", "ring", "amulet", "belt",
  "weaponMain", "weaponOffhand", "bothHands", "natural", "missile", "weapon"
];

const SLOT_TO_ACTOR_KEYS = { armor:["armor"], shield:["shield"], ring:["ringLeft","ringRight"], amulet:["amulet"], cloak:["cloak"], boots:["boots"], gloves:["gloves"], belt:["belt"], weapon:["weaponMain","weaponOffhand"], weaponmain:["weaponMain"], weaponoffhand:["weaponOffhand"], bothhands:["weaponMain","weaponOffhand"], natural:[], missile:["weaponMain","weaponOffhand"], helmet:[] };
const slotLog=(m,d={})=>console.info(`[BECMI equip] ${m}`,d);
export function ensureActorEquipmentSlots(actor){const current=actor?.system?.equipmentSlots??{};return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_EQUIPMENT_SLOTS),current??{},{inplace:false});}
function normalizeItemSlot(item){const explicit=String(item?.system?.slot??"").trim().toLowerCase(); if(explicit) return explicit; if(item?.type==="armor") return "armor"; if(item?.type==="weapon") { if(item?.system?.weaponType==="natural") return "natural"; if(item?.system?.hands==="two") return "bothHands"; return "weaponMain"; } return "";}
export async function unequipItem(actor,item){ if(!actor||!item) return; const slots=ensureActorEquipmentSlots(actor); for(const[k,v] of Object.entries(slots)){ if(v===item.id) slots[k]=null; } await Promise.all([item.update({"system.equipped":false,"system.location":"worn"}),actor.update({"system.equipmentSlots":slots})]); }
export async function equipItem(actor,item){ if(!actor||!item) return false; let itemSlot=normalizeItemSlot(item); const weaponType=item?.system?.weaponType; const hands=item?.system?.hands??(item?.system?.twoHanded?"two":"one"); if(item.type==='weapon'){ if(weaponType==='natural') itemSlot='natural'; else if(hands==='two') itemSlot='bothHands'; else if(itemSlot==='weapon') itemSlot='weaponMain'; }
 const slots=ensureActorEquipmentSlots(actor); const pending=new Set();
 const mainWeapon=slots.weaponMain?actor.items.get(slots.weaponMain):null; const mainIsTwo=mainWeapon?.type==='weapon' && ((mainWeapon.system?.hands==='two')||mainWeapon.system?.slot==='bothHands');
 if((itemSlot==='shield'||itemSlot==='weaponoffhand') && mainIsTwo) return false;
 if(itemSlot==='natural'){ await item.update({"system.equipped":true,"system.location":"equipped","system.slot":"natural","system.hands":"none"}); return true; }
 if(itemSlot==='bothhands'){ if(slots.shield) pending.add(slots.shield); if(slots.weaponOffhand) pending.add(slots.weaponOffhand); if(slots.weaponMain && slots.weaponMain!==item.id) pending.add(slots.weaponMain); slots.weaponMain=item.id; slots.weaponOffhand=item.id; }
 else if(itemSlot==='shield'){ if(slots.weaponOffhand && slots.weaponOffhand!==item.id) pending.add(slots.weaponOffhand); slots.shield=item.id; slots.weaponOffhand=item.id; }
 else if(itemSlot==='weaponoffhand'){ if(slots.shield) pending.add(slots.shield); if(slots.weaponOffhand && slots.weaponOffhand!==item.id) pending.add(slots.weaponOffhand); slots.weaponOffhand=item.id; }
 else if(itemSlot==='weaponmain'||itemSlot==='missile'||itemSlot==='weapon'){ if(slots.weaponMain && slots.weaponMain!==item.id) pending.add(slots.weaponMain); slots.weaponMain=item.id; }
 else { const keys=SLOT_TO_ACTOR_KEYS[itemSlot]??[]; if(!keys.length) return false; const k=keys[0]; if(slots[k]&&slots[k]!==item.id) pending.add(slots[k]); slots[k]=item.id; }
 for(const id of pending){ const it=actor.items.get(id); if(!it) continue; await it.update({"system.equipped":false,"system.location":"worn"}); for(const[k,v]of Object.entries(slots)){ if(v===id) slots[k]=null; } }
 await Promise.all([item.update({"system.equipped":true,"system.location":"equipped","system.slot":itemSlot}),actor.update({"system.equipmentSlots":slots})]); return true; }
