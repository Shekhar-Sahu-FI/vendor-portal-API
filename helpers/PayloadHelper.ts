import { Status, WarehouseType } from './globalEnums';

export interface UnitPayload {
  unitName: string;
  alias: string;
  statusId: number;
  description: string;
}

export interface ItemPayload {
  itemName: string;
  itemCode: string;
  unitId: number | string;
  categoryId: number | string;
  subgroupId: number | string;
  price: number;
  statusId: number;
  makeId?: number | string;
}

export interface VendorPayload {
  vendorName: string;
  vendorCode: string;
  businessTypeId: number | string;
  countryId: number | string;
  email: string;
  statusId: number;
}

export class PayloadHelper {
  /**
   * Helper utility to merge a default object with overriding properties deeply.
   */
  private static merge<T>(defaults: T, overrides?: Partial<T>): T {
    if (!overrides) {
      return defaults;
    }

    const merged = { ...defaults };
    for (const key of Object.keys(overrides) as Array<keyof T>) {
      const val = overrides[key];
      if (val !== undefined) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && typeof merged[key] === 'object') {
          merged[key] = this.merge(merged[key], val) as any;
        } else {
          merged[key] = val as any;
        }
      }
    }
    return merged;
  }

  /**
   * Generate Unit Master Payload with dynamic values to avoid duplication by default.
   */
  public static unit(overrides?: Partial<UnitPayload>): UnitPayload {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: UnitPayload = {
      unitName: `Unit_${timestamp}_${randomSuffix}`,
      alias: `U_${randomSuffix}`,
      statusId: Status.Active,
      description: 'Standard system measurement unit',
    };

    return this.merge<UnitPayload>(defaults, overrides);
  }

  /**
   * Generate Item Master Payload requiring Unit, Category, and Subgroup links.
   */
  public static item(overrides?: Partial<ItemPayload>): ItemPayload {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: ItemPayload = {
      itemName: `Item_${timestamp}_${randomSuffix}`,
      itemCode: `ITEM-${randomSuffix}`,
      unitId: 1, // Default fallback ID
      categoryId: 1, // Default fallback ID
      subgroupId: 1, // Default fallback ID
      price: 150.50,
      statusId: Status.Active,
    };

    return this.merge<ItemPayload>(defaults, overrides);
  }

  /**
   * Generate Vendor Master Payload requiring Business Type and Country links.
   */
  public static vendor(overrides?: Partial<VendorPayload>): VendorPayload {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: VendorPayload = {
      vendorName: `Vendor Corp ${randomSuffix}`,
      vendorCode: `VND-${randomSuffix}-${timestamp.toString().substring(8)}`,
      businessTypeId: 1, // Default fallback ID
      countryId: 1, // Default fallback ID
      email: `contact@vendor-${randomSuffix.toLowerCase()}.com`,
      statusId: Status.Active,
    };

    return this.merge<VendorPayload>(defaults, overrides);
  }
  /**
   * Generate Warehouse Master Payload requiring Type, Ownership, and Address links.
   */
  public static warehouse(overrides?: Partial<any>): any {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: any = {
      statusId: Status.Active,
      statusRemarks: '',
      warehouseName: `WH_${timestamp}_${randomSuffix}`,
      locationId: 1, // Default fallback
      typeId: WarehouseType.InHouse, // Default to In-house
      ownershipId: null, // Ownership optional for In-house
      partyId: null,
      address1: `Line 1 ${randomSuffix}`,
      address2: `Line 2 ${randomSuffix}`,
      address3: `Line 3 ${randomSuffix}`,
      pincode: `123456`,
      cityId: 1,
      stateId: 1,
      countryId: 1
    };

    return this.merge<any>(defaults, overrides);
  }
}
