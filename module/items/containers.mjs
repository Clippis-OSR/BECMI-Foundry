// Container-focused exports from the reusable inventory service layer.
export {
  getInventoryItems,
  getItemsByLocation,
  getContainerContents,
  canItemFitInContainer,
  getContainers,
  getItemsInContainer,
  getContainerContentsWeight,
  getContainerTotalWeight,
  moveItemToContainer,
  validateItemContainerAssignment
} from "./inventory-manager.mjs";

export { calculateContainerEncumbrance } from "./encumbrance.mjs";
