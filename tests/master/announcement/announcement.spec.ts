import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Announcement Master API Tests', () => {
  
  test('should successfully save and delete an announcement', async ({ announcementApi, workflow }) => {
    const payload = {
      typeId: 1, // e.g. Ticker
      displayId: 1, // e.g. All Users
      title: "System Maintenance Announcement",
      description: "System will be down for maintenance.",
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().getTime() + 86400000).toISOString(), // +1 day
      scrollSpeed: 10,
      fontColor: "#000000",
      backgroundColor: "#ffffff",
      displayInAllPage: true,
      statusId: 1,
      statusRemarks: ""
    };

    // Automatically handles Save, extracts ID, performs delete, and asserts status outcomes
    await workflow.saveAndDelete(announcementApi, payload);
  });

  test('should save, retrieve by ID to verify, and then delete an announcement', async ({ announcementApi, workflow, verifyAnnouncement }) => {
    const payload = {
      typeId: 2, // e.g. Banner
      displayId: 1,
      title: "Welcome to New Portal",
      bannerSizeId: 1, 
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().getTime() + 86400000).toISOString(),
      fontColor: "#ffffff",
      backgroundColor: "#007bff",
      displayInAllPage: false,
      statusId: 1,
      statusRemarks: ""
    };

    await workflow.saveGetByIdAndDelete(announcementApi, payload, verifyAnnouncement);
  });

  test('should save, update details, and then delete an announcement', async ({ announcementApi, workflow }) => {
    const payload = {
      typeId: 1,
      displayId: 1,
      title: "Initial Title",
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().getTime() + 86400000).toISOString(),
      statusId: 1,
      statusRemarks: ""
    };

    const updatePayload = {
      typeId: 1,
      displayId: 1,
      title: "Updated Title",
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().getTime() + 86400000).toISOString(),
      statusId: 1,
      statusRemarks: ""
    };

    await workflow.saveUpdateAndDelete(announcementApi, payload, updatePayload);
  });

  // UNHANDLED / MISSING VALIDATION TEST CASES (As identified from frontend analysis)
  test.describe('Validation Scenarios', () => {

    test('should return validation error when title is empty', async ({ announcementApi }) => {
      const invalidPayload = {
        typeId: 1,
        displayId: 1,
        title: "", // Empty Title
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(),
        statusId: 1,
        statusRemarks: ""
      };

      const response = await announcementApi.save(invalidPayload);
      await expectValidation(response, ['Title is required.']);
    });

    test('should return validation error when typeId is empty', async ({ announcementApi }) => {
      const invalidPayload = {
        displayId: 1,
        title: "Test",
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(),
        statusId: 1,
        statusRemarks: ""
      };

      const response = await announcementApi.save(invalidPayload);
      // Wait to see if typeId validation exists
      await expectValidation(response, ['Type is required.']);
    });

    test('should return validation error when audience (displayId) is empty', async ({ announcementApi }) => {
      const invalidPayload = {
        typeId: 1,
        title: "Test",
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(),
        statusId: 1,
        statusRemarks: ""
      };

      const response = await announcementApi.save(invalidPayload);
      await expectValidation(response, ['Display To is required.']); 
    });

    // Validation Rule 10001: Overlapping active banners
    test('should return validation error when saving an active Banner with overlapping dates', async ({ announcementApi, workflow }) => {
      // 1. Create a base banner
      const basePayload = {
        typeId: 2, // Banner
        displayId: 1,
        title: "Base Banner",
        bannerSizeId: 1,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(), // 1 day
        statusId: 1, // Active
        statusRemarks: ""
      };

      const baseResponse = await announcementApi.save(basePayload);
      const baseId = baseResponse.body.id || baseResponse.body.data?.id;

      // 2. Try to create an overlapping banner
      const overlappingPayload = {
        typeId: 2, // Banner
        displayId: 1,
        title: "Overlapping Banner",
        bannerSizeId: 1,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(), // Overlaps
        statusId: 1, // Active
        statusRemarks: ""
      };

      const overlapResponse = await announcementApi.save(overlappingPayload);
      
      // We expect the specific overlap validation message
      await expectValidation(overlapResponse, ['An active Banner announcement already exists for the selected date and time range. Please modify the existing Banner announcement or choose a different date and time range.']);

      // Cleanup base banner
      if (baseId) {
         await announcementApi.deleteRecord(baseId);
      }
    });

    test('should allow saving News Feed (Ticker) with overlapping dates', async ({ announcementApi, workflow }) => {
      // 1. Create a base ticker
      const basePayload = {
        typeId: 1, // News Feed
        displayId: 1,
        title: "Base Ticker",
        scrollSpeed: 10,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(), // 1 day
        statusId: 1, // Active
        statusRemarks: ""
      };

      const baseResponse = await announcementApi.save(basePayload);
      const baseId = baseResponse.body.id || baseResponse.body.data?.id;

      // 2. Try to create an overlapping ticker
      const overlappingPayload = {
        typeId: 1, // News Feed
        displayId: 1,
        title: "Overlapping Ticker",
        scrollSpeed: 15,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(), // Overlaps
        statusId: 1, // Active
        statusRemarks: ""
      };

      const overlapResponse = await announcementApi.save(overlappingPayload);
      
      // Should succeed, not throw overlap error
      expect(overlapResponse.body.success).toBe(true);
      const overlapId = overlapResponse.body.id || overlapResponse.body.data?.id;

      // Cleanup
      if (baseId) await announcementApi.deleteRecord(baseId);
      if (overlapId) await announcementApi.deleteRecord(overlapId);
    });

    test('should return validation error when bannerSizeId is empty for Banner type', async ({ announcementApi }) => {
      const invalidPayload = {
        typeId: 2, // Banner
        displayId: 1,
        title: "Test Banner Size Missing",
        // bannerSizeId is deliberately missing
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(),
        statusId: 1,
        statusRemarks: ""
      };

      const response = await announcementApi.save(invalidPayload);
      await expectValidation(response, ['Banner Size is required for Banner type.']); // Adjust message to match actual API behavior
    });
    
    // Previous Missing Potential Validations
    test('should handle validation when endDate is before startDate (UNHANDLED POTENTIAL)', async ({ announcementApi }) => {
      const invalidPayload = {
        typeId: 1,
        displayId: 1,
        title: "Invalid Dates",
        startDate: new Date(new Date().getTime() + 86400000).toISOString(), // Tomorrow
        endDate: new Date().toISOString(), // Today
        statusId: 1,
        statusRemarks: ""
      };

      const response = await announcementApi.save(invalidPayload);
      await expectValidation(response, ['End Date must be greater than or equal to Start Date.']);
    });

    test('should handle validation when title exceeds max length (UNHANDLED POTENTIAL)', async ({ announcementApi }) => {
      const invalidPayload = {
        typeId: 1,
        displayId: 1,
        title: "A".repeat(500), // DB limit is VARCHAR(255)
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(),
        statusId: 1,
        statusRemarks: ""
      };

      const response = await announcementApi.save(invalidPayload);
      await expectValidation(response, ['Title length exceeds maximum limit.']);
    });

    test('should handle validation for empty status remark on inactive (UNHANDLED POTENTIAL)', async ({ announcementApi }) => {
      const invalidPayload = {
        typeId: 1,
        displayId: 1,
        title: "Inactive Without Remark",
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 86400000).toISOString(),
        statusId: 2, // Inactive
        statusRemarks: "" // Empty remark
      };

      const response = await announcementApi.save(invalidPayload);
      await expectValidation(response, ['Status Remarks is required.']);
    });

  });
});
