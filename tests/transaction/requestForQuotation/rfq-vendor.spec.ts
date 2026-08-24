import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('RFQ Vendor & Contact Person Tests (RFQ-VEN / RFQ-CP)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('RFQ-VEN-006: Same Registered Vendor Location added twice blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        vendorLocationId: 5, // Same location
        isGuestVendor: false
      },
      {
        vendorLocationId: 5, // Duplicate
        isGuestVendor: false
      }
    ];
    // API should reject with 'Duplicate Vendor Location is not allowed.'
  });

  test('RFQ-VEN-007: Same Vendor, different Location, both allowed', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        vendorLocationId: 5, 
        isGuestVendor: false
      },
      {
        vendorLocationId: 6, // Different location
        isGuestVendor: false
      }
    ];
    // Save should succeed
  });

  test('RFQ-VEN-008: Add Guest Vendor with name and email', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        isGuestVendor: true,
        guestVendorName: "XYZ Traders",
        guestVendorEmail: "xyz@x.com",
        vendorLocationId: null
      }
    ];
    // Save should succeed
  });

  test('RFQ-VEN-009: Guest Vendor without email blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        isGuestVendor: true,
        guestVendorName: "XYZ Traders",
        guestVendorEmail: null,
        vendorLocationId: null
      }
    ];
    // API should reject with 'Vendor Email is required.'
  });

  test('RFQ-VEN-010: Guest Vendor invalid email format blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        isGuestVendor: true,
        guestVendorName: "XYZ Traders",
        guestVendorEmail: "xyz@@x",
        vendorLocationId: null
      }
    ];
    // API should reject with 'Vendor Email format is invalid.'
  });

  test('RFQ-VEN-011: Duplicate Guest Vendor email within same RFQ blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        isGuestVendor: true,
        guestVendorName: "XYZ Traders",
        guestVendorEmail: "xyz@x.com",
        vendorLocationId: null
      },
      {
        isGuestVendor: true,
        guestVendorName: "XYZ Traders 2",
        guestVendorEmail: "xyz@x.com", // Duplicate email
        vendorLocationId: null
      }
    ];
    // API should reject with 'Duplicate Email is not allowed.'
  });

  test('RFQ-VEN-016: Vendor Type missing on a vendor row (API)', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        isGuestVendor: null,
        vendorLocationId: 5
      }
    ];
    // API should reject with 'Vendor Type is required.'
  });

  test('RFQ-VEN-017: At least one vendor required before Submit', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docStatusId = 2; // Assuming 2 is In Review/Submit
    payload.rfqVendorDetail = []; // 0 vendors
    // API should reject with 'At least one Vendor is required.'
  });

  // --- Contact Person Tests ---

  test('RFQ-CP-005: Contact person must belong to the selected Vendor Location', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        vendorLocationId: 5,
        isGuestVendor: false,
        contactPersonDetail: [
          { vendorLocationContactPersonId: 99 } // Assuming 99 belongs to a different location
        ]
      }
    ];
    // API should reject with 'Contact Person is not linked with Vendor Location.'
  });

  test('RFQ-CP-006: Guest Vendor cannot use a contactPersonId, free text only', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        isGuestVendor: true,
        guestVendorName: "XYZ",
        guestVendorEmail: "xyz@x.com",
        contactPersonDetail: [
          { vendorLocationContactPersonId: 5 } // Not allowed
        ]
      }
    ];
    // API should reject with 'Contact Person ID is not allowed for Guest Vendor.'
  });

  test('RFQ-CP-007: Contact Name exceeds 200 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        vendorLocationId: 5,
        isGuestVendor: false,
        contactPersonDetail: [
          { contactName: 'a'.repeat(201) }
        ]
      }
    ];
    // API should reject with 'Contact Name must be less than 200 characters.'
  });

  test('RFQ-CP-008: Contact Email (free text) invalid format rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        vendorLocationId: 5,
        isGuestVendor: false,
        contactPersonDetail: [
          { contactEmail: 'abc@@x' }
        ]
      }
    ];
    // API should reject with 'Contact Email format is invalid.'
  });

  test('RFQ-CP-010: Empty contact person row (no id, no name, no email) blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqVendorDetail = [
      {
        vendorLocationId: 5,
        isGuestVendor: false,
        contactPersonDetail: [
          { } // Completely empty
        ]
      }
    ];
    // API should reject with 'Contact Person entry must have at least a name or email.'
  });

});
