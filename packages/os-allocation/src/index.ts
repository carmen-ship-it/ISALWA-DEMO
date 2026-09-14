export {
  ORDER_ALLOCATION_COLUMNS,
  ORDER_ALLOCATION_COMMAND,
  ORDER_ALLOCATION_GOODS_KIND,
  ORDER_ALLOCATION_LABEL,
  ORDER_ALLOCATION_SOURCE,
  allocationFulfillsWholeOrder,
  allocationIsOfficialStock,
  decideAllocation,
  formatQuantity,
  observeFinishedGoodsReceipt,
  parseQuantity,
  projectFinishedGoodsAvailability,
  quantityAllocatedToOrderLine,
  receiptAllocatesToOrder,
} from '../../os-contracts/src/order-allocation';
export type {
  AllocateFinishedGoodsInput,
  AllocateFinishedGoodsResult,
  AllocationConflict,
  AvailabilityProjection,
  CrossTenantAllocation,
  ExceedsAvailable,
  FinishedGoodsReceiptQuantity,
  MissingAvailability,
  OrderAllocation,
} from '../../os-contracts/src/order-allocation';

export { InMemoryOrderAllocationStore, IN_MEMORY_ALLOCATION_IS_TENANT_PROOF } from './store';
export {
  ALLOCATION_LIVE_WRITE,
  allocateFinishedGoodsForSession,
} from './allocate-command';
export type {
  AllocateSessionResult,
  AllocationSession,
  AllocationTenantTargets,
} from './allocate-command';
