// import { test, expect } from '../../../fixtures/apiFixtures';
// import { TransactionPayloadHelper } from '../../../helpers/TransactionPayloadHelper';
// 
// test.describe('RFQ and Quotation Flow (Temp Spec)', () => {
//     test('should generate RFQ payload, save RFQ, and submit Quotation for vendor', async ({ requestForQuotationApi, quotationApi, lookup }) => {
// 
// 
        // 1. Create dynamic RFQ payload using TransactionPayloadHelper & lookup
//         const rfqPayload = await TransactionPayloadHelper.createRFQPayload(lookup, {
//             companyName: "Company One",
//             docSeriesPattern: "RFQ/{{FY2}}/{{MMM}}/{{N}}",
//             docTypeName: "RFQ - Standard - Division One Company One Two Three",
//             tncGroupName: "TNC Group One",
//             items: [
//                 {
//                     itemName: "Item Two Multi Unit Make One Two Three",
//                     makeName: "Make One",
//                     unitName: "Unit Two",
//                     qty: "150",
//                     techSpecification: "asdfsf",
//                     remarks: "dsfa"
//                 },
//                 {
//                     itemName: "Item Three No Multi Unit All Make",
//                     makeName: "Make Two",
//                     unitName: "Unit Two",
//                     qty: "152.212",
//                     techSpecification: "sdfsdfs",
//                     remarks: "sdfas"
//                 }
//             ],
//             vendors: [
//                 {
//                     vendorName: "ABC Suppliers",
//                     vendorLocationName: "Plot 21, Industrial Area",
//                     contactPersonName: "Rajesh Sharma"
//                 },
//                 {
//                     vendorName: "QWE Engineering Traders",
//                     vendorLocationName: "MIDC Estate",
//                     contactPersonName: "Amit Verma"
//                 },
//                 {
//                     vendorName: "XYZ Manufacturing Inc",
//                     vendorLocationName: "1200 Industrial Drive",
//                     contactPersonName: "John Williams"
//                 }
//             ]
//         });
// 
//         const result = await TransactionPayloadHelper.saveRfqAndQuotation(
//             requestForQuotationApi,
//             quotationApi,
//             rfqPayload,
//             ["ABC Suppliers", "QWE Engineering Traders", "XYZ Manufacturing Inc"]
//         );
        // Assertions
//         expect(result.rfqSaveResponse.body.success, "RFQ save should be successful").toBe(true);
//         expect(result.rfqData.id, "RFQ ID should be defined").toBeDefined();
//         expect(result.quotations.length, "Should save quotations for all vendors").toBe(3);
//         for (const q of result.quotations) {
//             expect(q.quotationSaveResponse.body.success, `Quotation save should be successful for ${q.vendorName}`).toBe(true);
//         }
//     });
// });
// 