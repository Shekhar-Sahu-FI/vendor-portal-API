import { test, expect } from '../../fixtures/apiFixtures';
import * as Enums from '../../helpers/globalEnums';

test.describe('Global Data API Tests', () => {

    test('should return 200 and match enum values for announcementAudience', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('announcementAudience');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Company = data.find((o: any) => o.id === Enums.AnnouncementAudience.Company || o.announcementAudienceName === 'Company');
        expect(item_Company, 'Expected to find Company in response').toBeDefined();
        const item_Vendor = data.find((o: any) => o.id === Enums.AnnouncementAudience.Vendor || o.announcementAudienceName === 'Vendor');
        expect(item_Vendor, 'Expected to find Vendor in response').toBeDefined();
        const item_Both = data.find((o: any) => o.id === Enums.AnnouncementAudience.Both || o.announcementAudienceName === 'Both');
        expect(item_Both, 'Expected to find Both in response').toBeDefined();
        const item_LandingPage = data.find((o: any) => o.id === Enums.AnnouncementAudience.LandingPage || o.announcementAudienceName === 'LandingPage');
        expect(item_LandingPage, 'Expected to find LandingPage in response').toBeDefined();
    });

    test('should return 200 and match enum values for announcementBannerSize', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('announcementBannerSize');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Small = data.find((o: any) => o.id === Enums.AnnouncementBannerSize.Small || o.announcementBannerSizeName === 'Small');
        expect(item_Small, 'Expected to find Small in response').toBeDefined();
        const item_Medium = data.find((o: any) => o.id === Enums.AnnouncementBannerSize.Medium || o.announcementBannerSizeName === 'Medium');
        expect(item_Medium, 'Expected to find Medium in response').toBeDefined();
        const item_Large = data.find((o: any) => o.id === Enums.AnnouncementBannerSize.Large || o.announcementBannerSizeName === 'Large');
        expect(item_Large, 'Expected to find Large in response').toBeDefined();
        const item_FullScreen = data.find((o: any) => o.id === Enums.AnnouncementBannerSize.FullScreen || o.announcementBannerSizeName === 'FullScreen');
        expect(item_FullScreen, 'Expected to find FullScreen in response').toBeDefined();
    });

    test('should return 200 and match enum values for announcementType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('announcementType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_NewsFeed = data.find((o: any) => o.id === Enums.AnnouncementType.NewsFeed || o.announcementTypeName === 'NewsFeed');
        expect(item_NewsFeed, 'Expected to find NewsFeed in response').toBeDefined();
        const item_Banner = data.find((o: any) => o.id === Enums.AnnouncementType.Banner || o.announcementTypeName === 'Banner');
        expect(item_Banner, 'Expected to find Banner in response').toBeDefined();
    });

    test('should return 200 and match enum values for approvalRule', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('approvalRule');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_AllUsersMustApprove = data.find((o: any) => o.id === Enums.ApprovalRule.AllUsersMustApprove || o.approvalRuleName === 'AllUsersMustApprove');
        expect(item_AllUsersMustApprove, 'Expected to find AllUsersMustApprove in response').toBeDefined();
        const item_AnyOneUserCanApprove = data.find((o: any) => o.id === Enums.ApprovalRule.AnyOneUserCanApprove || o.approvalRuleName === 'AnyOneUserCanApprove');
        expect(item_AnyOneUserCanApprove, 'Expected to find AnyOneUserCanApprove in response').toBeDefined();
    });

    test('should return 200 and match enum values for approvalScope', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('approvalScope');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_CompanyWise = data.find((o: any) => o.id === Enums.ApprovalScope.CompanyWise || o.approvalScopeName === 'CompanyWise');
        expect(item_CompanyWise, 'Expected to find CompanyWise in response').toBeDefined();
        const item_CompanyDivisionWise = data.find((o: any) => o.id === Enums.ApprovalScope.CompanyDivisionWise || o.approvalScopeName === 'CompanyDivisionWise');
        expect(item_CompanyDivisionWise, 'Expected to find CompanyDivisionWise in response').toBeDefined();
        const item_CompanyDivisionDepartmentWise = data.find((o: any) => o.id === Enums.ApprovalScope.CompanyDivisionDepartmentWise || o.approvalScopeName === 'CompanyDivisionDepartmentWise');
        expect(item_CompanyDivisionDepartmentWise, 'Expected to find CompanyDivisionDepartmentWise in response').toBeDefined();
    });

    test('should return 200 and match enum values for auctionType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('auctionType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Forward = data.find((o: any) => o.id === Enums.AuctionType.Forward || o.name === 'Forward');
        expect(item_Forward, 'Expected to find Forward in response').toBeDefined();
        const item_Reverse = data.find((o: any) => o.id === Enums.AuctionType.Reverse || o.name === 'Reverse');
        expect(item_Reverse, 'Expected to find Reverse in response').toBeDefined();
    });

    test('should return 200 and match enum values for bankAccountType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('bankAccountType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Savings = data.find((o: any) => o.id === Enums.BankAccountType.Savings || o.bankAccountTypeName === 'Savings');
        expect(item_Savings, 'Expected to find Savings in response').toBeDefined();
        const item_Current = data.find((o: any) => o.id === Enums.BankAccountType.Current || o.bankAccountTypeName === 'Current');
        expect(item_Current, 'Expected to find Current in response').toBeDefined();
        const item_Salary = data.find((o: any) => o.id === Enums.BankAccountType.Salary || o.bankAccountTypeName === 'Salary');
        expect(item_Salary, 'Expected to find Salary in response').toBeDefined();
        const item_FixedDeposit = data.find((o: any) => o.id === Enums.BankAccountType.FixedDeposit || o.bankAccountTypeName === 'FixedDeposit');
        expect(item_FixedDeposit, 'Expected to find FixedDeposit in response').toBeDefined();
    });

    test('should return 200 and match enum values for baseDateType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('baseDateType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_DocumentDate = data.find((o: any) => o.id === Enums.BaseDateType.DocumentDate || o.baseDateTypeName === 'DocumentDate');
        expect(item_DocumentDate, 'Expected to find DocumentDate in response').toBeDefined();
        const item_PostingDate = data.find((o: any) => o.id === Enums.BaseDateType.PostingDate || o.baseDateTypeName === 'PostingDate');
        expect(item_PostingDate, 'Expected to find PostingDate in response').toBeDefined();
        const item_TransactionDate = data.find((o: any) => o.id === Enums.BaseDateType.TransactionDate || o.baseDateTypeName === 'TransactionDate');
        expect(item_TransactionDate, 'Expected to find TransactionDate in response').toBeDefined();
    });

    test('should return 200 and match enum values for basePriceSetting', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('basePriceSetting');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_None = data.find((o: any) => o.id === Enums.BasePriceSetting.None || o.name === 'None');
        expect(item_None, 'Expected to find None in response').toBeDefined();
        const item_OverAll = data.find((o: any) => o.id === Enums.BasePriceSetting.OverAll || o.name === 'OverAll');
        expect(item_OverAll, 'Expected to find OverAll in response').toBeDefined();
        const item_ItemWise = data.find((o: any) => o.id === Enums.BasePriceSetting.ItemWise || o.name === 'ItemWise');
        expect(item_ItemWise, 'Expected to find ItemWise in response').toBeDefined();
    });

    test('should return 200 and match enum values for bidDifferenceType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('bidDifferenceType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Amount = data.find((o: any) => o.id === Enums.BidDifferenceType.Amount || o.name === 'Amount');
        expect(item_Amount, 'Expected to find Amount in response').toBeDefined();
        const item_Percentage = data.find((o: any) => o.id === Enums.BidDifferenceType.Percentage || o.name === 'Percentage');
        expect(item_Percentage, 'Expected to find Percentage in response').toBeDefined();
    });

    test('should return 200 and match enum values for billingQtyBasis', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('billingQtyBasis');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_AcceptedQty = data.find((o: any) => o.id === Enums.BillingQtyBasis.AcceptedQty || o.billingQtyBasisName === 'AcceptedQty');
        expect(item_AcceptedQty, 'Expected to find AcceptedQty in response').toBeDefined();
        const item_ChallanQty = data.find((o: any) => o.id === Enums.BillingQtyBasis.ChallanQty || o.billingQtyBasisName === 'ChallanQty');
        expect(item_ChallanQty, 'Expected to find ChallanQty in response').toBeDefined();
        const item_POQty = data.find((o: any) => o.id === Enums.BillingQtyBasis.POQty || o.billingQtyBasisName === 'POQty');
        expect(item_POQty, 'Expected to find POQty in response').toBeDefined();
        const item_ReceivedQty = data.find((o: any) => o.id === Enums.BillingQtyBasis.ReceivedQty || o.billingQtyBasisName === 'ReceivedQty');
        expect(item_ReceivedQty, 'Expected to find ReceivedQty in response').toBeDefined();
    });

    test('should return 200 and match enum values for budgetType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('budgetType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_DivisionDepartment = data.find((o: any) => o.id === Enums.BudgetType.DivisionDepartment || o.name === 'DivisionDepartment');
        expect(item_DivisionDepartment, 'Expected to find DivisionDepartment in response').toBeDefined();
        const item_Item = data.find((o: any) => o.id === Enums.BudgetType.Item || o.name === 'Item');
        expect(item_Item, 'Expected to find Item in response').toBeDefined();
        const item_CostCenter = data.find((o: any) => o.id === Enums.BudgetType.CostCenter || o.name === 'CostCenter');
        expect(item_CostCenter, 'Expected to find CostCenter in response').toBeDefined();
    });

    test('should return 200 and match enum values for businessPartnerType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('businessPartnerType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Supplier = data.find((o: any) => o.id === Enums.BusinessPartnerType.Supplier || o.businessPartnerTypeName === 'Supplier');
        expect(item_Supplier, 'Expected to find Supplier in response').toBeDefined();
        const item_Transporter = data.find((o: any) => o.id === Enums.BusinessPartnerType.Transporter || o.businessPartnerTypeName === 'Transporter');
        expect(item_Transporter, 'Expected to find Transporter in response').toBeDefined();
    });

    test('should return 200 and match enum values for calcNature', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('calcNature');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Addition = data.find((o: any) => o.id === Enums.CalcNature.Addition || o.calcNatureName === 'Addition');
        expect(item_Addition, 'Expected to find Addition in response').toBeDefined();
        const item_Subtraction = data.find((o: any) => o.id === Enums.CalcNature.Subtraction || o.calcNatureName === 'Subtraction');
        expect(item_Subtraction, 'Expected to find Subtraction in response').toBeDefined();
    });

    test('should return 200 and match enum values for chargeOn', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('chargeOn');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_OnItem = data.find((o: any) => o.id === Enums.ChargeOn.OnItem || o.chargeOnName === 'OnItem');
        expect(item_OnItem, 'Expected to find OnItem in response').toBeDefined();
        const item_OnOrder = data.find((o: any) => o.id === Enums.ChargeOn.OnOrder || o.chargeOnName === 'OnOrder');
        expect(item_OnOrder, 'Expected to find OnOrder in response').toBeDefined();
    });

    test('should return 200 and match enum values for chargeType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('chargeType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Inclusive = data.find((o: any) => o.id === Enums.ChargeType.Inclusive || o.chargeTypeName === 'Inclusive');
        expect(item_Inclusive, 'Expected to find Inclusive in response').toBeDefined();
        const item_Exclusive = data.find((o: any) => o.id === Enums.ChargeType.Exclusive || o.chargeTypeName === 'Exclusive');
        expect(item_Exclusive, 'Expected to find Exclusive in response').toBeDefined();
    });

    test('should return 200 and match enum values for companyQuotationEditPolicy', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('companyQuotationEditPolicy');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_AllAllowed = data.find((o: any) => o.id === Enums.CompanyQuotationEditPolicy.AllAllowed || o.name === 'AllAllowed');
        expect(item_AllAllowed, 'Expected to find AllAllowed in response').toBeDefined();
        const item_NotAllowed = data.find((o: any) => o.id === Enums.CompanyQuotationEditPolicy.NotAllowed || o.name === 'NotAllowed');
        expect(item_NotAllowed, 'Expected to find NotAllowed in response').toBeDefined();
        const item_OnlyNewAllowed = data.find((o: any) => o.id === Enums.CompanyQuotationEditPolicy.OnlyNewAllowed || o.name === 'OnlyNewAllowed');
        expect(item_OnlyNewAllowed, 'Expected to find OnlyNewAllowed in response').toBeDefined();
        const item_OnlyEditAllowed = data.find((o: any) => o.id === Enums.CompanyQuotationEditPolicy.OnlyEditAllowed || o.name === 'OnlyEditAllowed');
        expect(item_OnlyEditAllowed, 'Expected to find OnlyEditAllowed in response').toBeDefined();
    });

    test('should return 200 and match enum values for comparativeStatementHead', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('comparativeStatementHead');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // No enum mapping found for comparativeStatementHead, verifying data exists
        expect(data.length).toBeGreaterThan(0);
    });

    test('should return 200 and match enum values for countryRegulation', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('countryRegulation');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_None = data.find((o: any) => o.id === Enums.CountryRegulation.None || o.name === 'None');
        expect(item_None, 'Expected to find None in response').toBeDefined();
        const item_IndiaGstPan = data.find((o: any) => o.id === Enums.CountryRegulation.IndiaGstPan || o.name === 'IndiaGstPan');
        expect(item_IndiaGstPan, 'Expected to find IndiaGstPan in response').toBeDefined();
        const item_IndiaGstPanMsme = data.find((o: any) => o.id === Enums.CountryRegulation.IndiaGstPanMsme || o.name === 'IndiaGstPanMsme');
        expect(item_IndiaGstPanMsme, 'Expected to find IndiaGstPanMsme in response').toBeDefined();
    });

    test('should return 200 and match enum values for docSeriesFrequency', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('docSeriesFrequency');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Daily = data.find((o: any) => o.id === Enums.DocSeriesFrequency.Daily || o.frequencyName === 'Daily');
        expect(item_Daily, 'Expected to find Daily in response').toBeDefined();
        const item_Monthly = data.find((o: any) => o.id === Enums.DocSeriesFrequency.Monthly || o.frequencyName === 'Monthly');
        expect(item_Monthly, 'Expected to find Monthly in response').toBeDefined();
        const item_Yearly = data.find((o: any) => o.id === Enums.DocSeriesFrequency.Yearly || o.frequencyName === 'Yearly');
        expect(item_Yearly, 'Expected to find Yearly in response').toBeDefined();
        const item_Continous = data.find((o: any) => o.id === Enums.DocSeriesFrequency.Continous || o.frequencyName === 'Continous');
        expect(item_Continous, 'Expected to find Continous in response').toBeDefined();
    });

    test('should return 200 and match enum values for documentStatus', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('documentStatus');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Draft = data.find((o: any) => o.id === Enums.DocumentStatus.Draft || o.statusName === 'Draft');
        expect(item_Draft, 'Expected to find Draft in response').toBeDefined();
        const item_InReview = data.find((o: any) => o.id === Enums.DocumentStatus.InReview || o.statusName === 'InReview');
        expect(item_InReview, 'Expected to find InReview in response').toBeDefined();
        const item_Authorized = data.find((o: any) => o.id === Enums.DocumentStatus.Authorized || o.statusName === 'Authorized');
        expect(item_Authorized, 'Expected to find Authorized in response').toBeDefined();
        const item_Rejected = data.find((o: any) => o.id === Enums.DocumentStatus.Rejected || o.statusName === 'Rejected');
        expect(item_Rejected, 'Expected to find Rejected in response').toBeDefined();
    });

    test('should return 200 and match enum values for dueBasis', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('dueBasis');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_GRN = data.find((o: any) => o.id === Enums.DueBasis.GRN || o.dueBasisName === 'GRN');
        expect(item_GRN, 'Expected to find GRN in response').toBeDefined();
        const item_GateEntry = data.find((o: any) => o.id === Enums.DueBasis.GateEntry || o.dueBasisName === 'GateEntry');
        expect(item_GateEntry, 'Expected to find GateEntry in response').toBeDefined();
    });

    test('should return 200 and match enum values for erpPartner', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('erpPartner');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // No enum mapping found for erpPartner, verifying data exists
        expect(data.length).toBeGreaterThan(0);
    });

    test('should return 200 and match enum values for expenditureType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('expenditureType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        expect.soft(true).toBe(false);

        // Verify enum values
        // const item_Capex = data.find((o: any) => o.id === Enums.ExpenditureType.Capex || o.expenditureTypeName === 'Capex');
        // expect.soft(item_Capex, 'Expected to find Capex in response').toBe(true);
        // const item_Opex = data.find((o: any) => o.id === Enums.ExpenditureType.Opex || o.expenditureTypeName === 'Opex');
        // expect.soft(item_Opex, 'Expected to find Opex in response').toBe(true);
        // const item_RawMaterial = data.find((o: any) => o.id === Enums.ExpenditureType.RawMaterial || o.expenditureTypeName === 'RawMaterial');
        // expect.soft(item_RawMaterial, 'Expected to find RawMaterial in response').toBe(true);
        // const item_General = data.find((o: any) => o.id === Enums.ExpenditureType.General || o.expenditureTypeName === 'General');
        // expect.soft(item_General, 'Expected to find General in response').toBe(true);
        // const item_DropShipment = data.find((o: any) => o.id === Enums.ExpenditureType.DropShipment || o.expenditureTypeName === 'DropShipment');
        // expect.soft(item_DropShipment, 'Expected to find DropShipment in response').toBe(true);
        // const item_Reusable = data.find((o: any) => o.id === Enums.ExpenditureType.Reusable || o.expenditureTypeName === 'Reusable');
        // expect.soft(item_Reusable, 'Expected to find Reusable in response').toBe(true);
        // const item_Trading = data.find((o: any) => o.id === Enums.ExpenditureType.Trading || o.expenditureTypeName === 'Trading');
        // expect.soft(item_Trading, 'Expected to find Trading in response').toBe(true);
    });

    test('should return 200 and match enum values for expenseNature', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('expenseNature');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Service = data.find((o: any) => o.id === Enums.ExpenseNature.Service || o.expenseNatureName === 'Service');
        expect(item_Service, 'Expected to find Service in response').toBeDefined();
        const item_Charges = data.find((o: any) => o.id === Enums.ExpenseNature.Charges || o.expenseNatureName === 'Charges');
        expect(item_Charges, 'Expected to find Charges in response').toBeDefined();
    });

    test('should return 200 and match enum values for extensionType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('extensionType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Manual = data.find((o: any) => o.id === Enums.ExtensionType.Manual || o.name === 'Manual');
        expect(item_Manual, 'Expected to find Manual in response').toBeDefined();
        const item_AutoGrace = data.find((o: any) => o.id === Enums.ExtensionType.AutoGrace || o.name === 'AutoGrace');
        expect(item_AutoGrace, 'Expected to find AutoGrace in response').toBeDefined();
    });

    test('should return 200 and match enum values for forms', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('forms');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Transaction = data.find((o: any) => o.id === Enums.FormMaster.Transaction || o.formCaption === 'Transaction');
        expect(item_Transaction, 'Expected to find Transaction in response').toBeDefined();
        const item_Security = data.find((o: any) => o.id === Enums.FormMaster.Security || o.formCaption === 'Security');
        expect(item_Security, 'Expected to find Security in response').toBeDefined();
        const item_Master = data.find((o: any) => o.id === Enums.FormMaster.Master || o.formCaption === 'Master');
        expect(item_Master, 'Expected to find Master in response').toBeDefined();
        const item_Utility = data.find((o: any) => o.id === Enums.FormMaster.Utility || o.formCaption === 'Utility');
        expect(item_Utility, 'Expected to find Utility in response').toBeDefined();
        const item_WorkList = data.find((o: any) => o.id === Enums.FormMaster.WorkList || o.formCaption === 'WorkList');
        expect(item_WorkList, 'Expected to find WorkList in response').toBeDefined();
        const item_AuditList = data.find((o: any) => o.id === Enums.FormMaster.AuditList || o.formCaption === 'AuditList');
        expect(item_AuditList, 'Expected to find AuditList in response').toBeDefined();
        const item_MaterialMaster = data.find((o: any) => o.id === Enums.FormMaster.MaterialMaster || o.formCaption === 'MaterialMaster');
        expect(item_MaterialMaster, 'Expected to find MaterialMaster in response').toBeDefined();
        const item_Reports = data.find((o: any) => o.id === Enums.FormMaster.Reports || o.formCaption === 'Reports');
        expect(item_Reports, 'Expected to find Reports in response').toBeDefined();
        const item_Dashboard = data.find((o: any) => o.id === Enums.FormMaster.Dashboard || o.formCaption === 'Dashboard');
        expect(item_Dashboard, 'Expected to find Dashboard in response').toBeDefined();
        const item_ManagementDashboard = data.find((o: any) => o.id === Enums.FormMaster.ManagementDashboard || o.formCaption === 'ManagementDashboard');
        expect(item_ManagementDashboard, 'Expected to find ManagementDashboard in response').toBeDefined();
        const item_UserDashboard = data.find((o: any) => o.id === Enums.FormMaster.UserDashboard || o.formCaption === 'UserDashboard');
        expect(item_UserDashboard, 'Expected to find UserDashboard in response').toBeDefined();
        const item_PurchaseRequest = data.find((o: any) => o.id === Enums.FormMaster.PurchaseRequest || o.formCaption === 'PurchaseRequest');
        expect(item_PurchaseRequest, 'Expected to find PurchaseRequest in response').toBeDefined();
        const item_RequestForQuotation = data.find((o: any) => o.id === Enums.FormMaster.RequestForQuotation || o.formCaption === 'RequestForQuotation');
        expect(item_RequestForQuotation, 'Expected to find RequestForQuotation in response').toBeDefined();
        const item_ComparativeStatement = data.find((o: any) => o.id === Enums.FormMaster.ComparativeStatement || o.formCaption === 'ComparativeStatement');
        expect(item_ComparativeStatement, 'Expected to find ComparativeStatement in response').toBeDefined();
        const item_QuotationCompany = data.find((o: any) => o.id === Enums.FormMaster.QuotationCompany || o.formCaption === 'QuotationCompany');
        expect(item_QuotationCompany, 'Expected to find QuotationCompany in response').toBeDefined();
        const item_QuotationVendor = data.find((o: any) => o.id === Enums.FormMaster.QuotationVendor || o.formCaption === 'QuotationVendor');
        expect(item_QuotationVendor, 'Expected to find QuotationVendor in response').toBeDefined();
        const item_PurchaseOrderCompany = data.find((o: any) => o.id === Enums.FormMaster.PurchaseOrderCompany || o.formCaption === 'PurchaseOrderCompany');
        expect(item_PurchaseOrderCompany, 'Expected to find PurchaseOrderCompany in response').toBeDefined();
        const item_PurchaseOrderVendor = data.find((o: any) => o.id === Enums.FormMaster.PurchaseOrderVendor || o.formCaption === 'PurchaseOrderVendor');
        expect(item_PurchaseOrderVendor, 'Expected to find PurchaseOrderVendor in response').toBeDefined();
        const item_CompanyMaster = data.find((o: any) => o.id === Enums.FormMaster.CompanyMaster || o.formCaption === 'CompanyMaster');
        expect(item_CompanyMaster, 'Expected to find CompanyMaster in response').toBeDefined();
        const item_DivisionMaster = data.find((o: any) => o.id === Enums.FormMaster.DivisionMaster || o.formCaption === 'DivisionMaster');
        expect(item_DivisionMaster, 'Expected to find DivisionMaster in response').toBeDefined();
        const item_CompanyLocationMaster = data.find((o: any) => o.id === Enums.FormMaster.CompanyLocationMaster || o.formCaption === 'CompanyLocationMaster');
        expect(item_CompanyLocationMaster, 'Expected to find CompanyLocationMaster in response').toBeDefined();
        const item_DepartmentMaster = data.find((o: any) => o.id === Enums.FormMaster.DepartmentMaster || o.formCaption === 'DepartmentMaster');
        expect(item_DepartmentMaster, 'Expected to find DepartmentMaster in response').toBeDefined();
        const item_CostCenterMaster = data.find((o: any) => o.id === Enums.FormMaster.CostCenterMaster || o.formCaption === 'CostCenterMaster');
        expect(item_CostCenterMaster, 'Expected to find CostCenterMaster in response').toBeDefined();
        const item_CountryMaster = data.find((o: any) => o.id === Enums.FormMaster.CountryMaster || o.formCaption === 'CountryMaster');
        expect(item_CountryMaster, 'Expected to find CountryMaster in response').toBeDefined();
        const item_StateMaster = data.find((o: any) => o.id === Enums.FormMaster.StateMaster || o.formCaption === 'StateMaster');
        expect(item_StateMaster, 'Expected to find StateMaster in response').toBeDefined();
        const item_CityMaster = data.find((o: any) => o.id === Enums.FormMaster.CityMaster || o.formCaption === 'CityMaster');
        expect(item_CityMaster, 'Expected to find CityMaster in response').toBeDefined();
        const item_RegionMaster = data.find((o: any) => o.id === Enums.FormMaster.RegionMaster || o.formCaption === 'RegionMaster');
        expect(item_RegionMaster, 'Expected to find RegionMaster in response').toBeDefined();
        const item_LocationMaster = data.find((o: any) => o.id === Enums.FormMaster.LocationMaster || o.formCaption === 'LocationMaster');
        expect(item_LocationMaster, 'Expected to find LocationMaster in response').toBeDefined();
        const item_CurrencyMaster = data.find((o: any) => o.id === Enums.FormMaster.CurrencyMaster || o.formCaption === 'CurrencyMaster');
        expect(item_CurrencyMaster, 'Expected to find CurrencyMaster in response').toBeDefined();
        const item_FinancialYearMaster = data.find((o: any) => o.id === Enums.FormMaster.FinancialYearMaster || o.formCaption === 'FinancialYearMaster');
        expect(item_FinancialYearMaster, 'Expected to find FinancialYearMaster in response').toBeDefined();
        const item_TaxMaster = data.find((o: any) => o.id === Enums.FormMaster.TaxMaster || o.formCaption === 'TaxMaster');
        expect(item_TaxMaster, 'Expected to find TaxMaster in response').toBeDefined();
        const item_DocSeriesMaster = data.find((o: any) => o.id === Enums.FormMaster.DocSeriesMaster || o.formCaption === 'DocSeriesMaster');
        expect(item_DocSeriesMaster, 'Expected to find DocSeriesMaster in response').toBeDefined();
        const item_DocTypeMaster = data.find((o: any) => o.id === Enums.FormMaster.DocTypeMaster || o.formCaption === 'DocTypeMaster');
        expect(item_DocTypeMaster, 'Expected to find DocTypeMaster in response').toBeDefined();
        const item_BusinessTypeMaster = data.find((o: any) => o.id === Enums.FormMaster.BusinessTypeMaster || o.formCaption === 'BusinessTypeMaster');
        expect(item_BusinessTypeMaster, 'Expected to find BusinessTypeMaster in response').toBeDefined();
        const item_VendorCategoryMaster = data.find((o: any) => o.id === Enums.FormMaster.VendorCategoryMaster || o.formCaption === 'VendorCategoryMaster');
        expect(item_VendorCategoryMaster, 'Expected to find VendorCategoryMaster in response').toBeDefined();
        const item_VendorRegistrationMaster = data.find((o: any) => o.id === Enums.FormMaster.VendorRegistrationMaster || o.formCaption === 'VendorRegistrationMaster');
        expect(item_VendorRegistrationMaster, 'Expected to find VendorRegistrationMaster in response').toBeDefined();
        const item_VendorMaster = data.find((o: any) => o.id === Enums.FormMaster.VendorMaster || o.formCaption === 'VendorMaster');
        expect(item_VendorMaster, 'Expected to find VendorMaster in response').toBeDefined();
        const item_VendorLocationMaster = data.find((o: any) => o.id === Enums.FormMaster.VendorLocationMaster || o.formCaption === 'VendorLocationMaster');
        expect(item_VendorLocationMaster, 'Expected to find VendorLocationMaster in response').toBeDefined();
        const item_VendorAttachmentMaster = data.find((o: any) => o.id === Enums.FormMaster.VendorAttachmentMaster || o.formCaption === 'VendorAttachmentMaster');
        expect(item_VendorAttachmentMaster, 'Expected to find VendorAttachmentMaster in response').toBeDefined();
        const item_ApprovalSetupMaster = data.find((o: any) => o.id === Enums.FormMaster.ApprovalSetupMaster || o.formCaption === 'ApprovalSetupMaster');
        expect(item_ApprovalSetupMaster, 'Expected to find ApprovalSetupMaster in response').toBeDefined();
        const item_PriorityMaster = data.find((o: any) => o.id === Enums.FormMaster.PriorityMaster || o.formCaption === 'PriorityMaster');
        expect(item_PriorityMaster, 'Expected to find PriorityMaster in response').toBeDefined();
        const item_CsReasonMaster = data.find((o: any) => o.id === Enums.FormMaster.CsReasonMaster || o.formCaption === 'CsReasonMaster');
        expect(item_CsReasonMaster, 'Expected to find CsReasonMaster in response').toBeDefined();
        const item_TermsConditionHeadMaster = data.find((o: any) => o.id === Enums.FormMaster.TermsConditionHeadMaster || o.formCaption === 'TermsConditionHeadMaster');
        expect(item_TermsConditionHeadMaster, 'Expected to find TermsConditionHeadMaster in response').toBeDefined();
        const item_TermsConditionGroupMaster = data.find((o: any) => o.id === Enums.FormMaster.TermsConditionGroupMaster || o.formCaption === 'TermsConditionGroupMaster');
        expect(item_TermsConditionGroupMaster, 'Expected to find TermsConditionGroupMaster in response').toBeDefined();
        const item_AnnouncementMaster = data.find((o: any) => o.id === Enums.FormMaster.AnnouncementMaster || o.formCaption === 'AnnouncementMaster');
        expect(item_AnnouncementMaster, 'Expected to find AnnouncementMaster in response').toBeDefined();
        const item_ExpenseGroupMaster = data.find((o: any) => o.id === Enums.FormMaster.ExpenseGroupMaster || o.formCaption === 'ExpenseGroupMaster');
        expect(item_ExpenseGroupMaster, 'Expected to find ExpenseGroupMaster in response').toBeDefined();
        const item_PaymentTermsGroupMaster = data.find((o: any) => o.id === Enums.FormMaster.PaymentTermsGroupMaster || o.formCaption === 'PaymentTermsGroupMaster');
        expect(item_PaymentTermsGroupMaster, 'Expected to find PaymentTermsGroupMaster in response').toBeDefined();
        const item_PrReasonMaster = data.find((o: any) => o.id === Enums.FormMaster.PrReasonMaster || o.formCaption === 'PrReasonMaster');
        expect(item_PrReasonMaster, 'Expected to find PrReasonMaster in response').toBeDefined();
        const item_TaxGroupMaster = data.find((o: any) => o.id === Enums.FormMaster.TaxGroupMaster || o.formCaption === 'TaxGroupMaster');
        expect(item_TaxGroupMaster, 'Expected to find TaxGroupMaster in response').toBeDefined();
        const item_WarehouseMaster = data.find((o: any) => o.id === Enums.FormMaster.WarehouseMaster || o.formCaption === 'WarehouseMaster');
        expect(item_WarehouseMaster, 'Expected to find WarehouseMaster in response').toBeDefined();
        const item_GroupMaster = data.find((o: any) => o.id === Enums.FormMaster.GroupMaster || o.formCaption === 'GroupMaster');
        expect(item_GroupMaster, 'Expected to find GroupMaster in response').toBeDefined();
        const item_CategoryMaster = data.find((o: any) => o.id === Enums.FormMaster.CategoryMaster || o.formCaption === 'CategoryMaster');
        expect(item_CategoryMaster, 'Expected to find CategoryMaster in response').toBeDefined();
        const item_SubgroupMaster = data.find((o: any) => o.id === Enums.FormMaster.SubgroupMaster || o.formCaption === 'SubgroupMaster');
        expect(item_SubgroupMaster, 'Expected to find SubgroupMaster in response').toBeDefined();
        const item_ItemMaster = data.find((o: any) => o.id === Enums.FormMaster.ItemMaster || o.formCaption === 'ItemMaster');
        expect(item_ItemMaster, 'Expected to find ItemMaster in response').toBeDefined();
        const item_UnitMaster = data.find((o: any) => o.id === Enums.FormMaster.UnitMaster || o.formCaption === 'UnitMaster');
        expect(item_UnitMaster, 'Expected to find UnitMaster in response').toBeDefined();
        const item_MakeMaster = data.find((o: any) => o.id === Enums.FormMaster.MakeMaster || o.formCaption === 'MakeMaster');
        expect(item_MakeMaster, 'Expected to find MakeMaster in response').toBeDefined();
        const item_SkipApproval = data.find((o: any) => o.id === Enums.FormMaster.SkipApproval || o.formCaption === 'SkipApproval');
        expect(item_SkipApproval, 'Expected to find SkipApproval in response').toBeDefined();
        const item_ReleaseIndent = data.find((o: any) => o.id === Enums.FormMaster.ReleaseIndent || o.formCaption === 'ReleaseIndent');
        expect(item_ReleaseIndent, 'Expected to find ReleaseIndent in response').toBeDefined();
        const item_DuplicateItemGroup = data.find((o: any) => o.id === Enums.FormMaster.DuplicateItemGroup || o.formCaption === 'DuplicateItemGroup');
        expect(item_DuplicateItemGroup, 'Expected to find DuplicateItemGroup in response').toBeDefined();
        const item_CsValidity = data.find((o: any) => o.id === Enums.FormMaster.CsValidity || o.formCaption === 'CsValidity');
        expect(item_CsValidity, 'Expected to find CsValidity in response').toBeDefined();
        const item_DataFetchUtility = data.find((o: any) => o.id === Enums.FormMaster.DataFetchUtility || o.formCaption === 'DataFetchUtility');
        expect(item_DataFetchUtility, 'Expected to find DataFetchUtility in response').toBeDefined();
        const item_PoCsExemption = data.find((o: any) => o.id === Enums.FormMaster.PoCsExemption || o.formCaption === 'PoCsExemption');
        expect(item_PoCsExemption, 'Expected to find PoCsExemption in response').toBeDefined();
        const item_PoCancellation = data.find((o: any) => o.id === Enums.FormMaster.PoCancellation || o.formCaption === 'PoCancellation');
        expect(item_PoCancellation, 'Expected to find PoCancellation in response').toBeDefined();
        const item_DueDateAmendment = data.find((o: any) => o.id === Enums.FormMaster.DueDateAmendment || o.formCaption === 'DueDateAmendment');
        expect(item_DueDateAmendment, 'Expected to find DueDateAmendment in response').toBeDefined();
        const item_AddVendor = data.find((o: any) => o.id === Enums.FormMaster.AddVendor || o.formCaption === 'AddVendor');
        expect(item_AddVendor, 'Expected to find AddVendor in response').toBeDefined();
        const item_IpWhitelist = data.find((o: any) => o.id === Enums.FormMaster.IpWhitelist || o.formCaption === 'IpWhitelist');
        expect(item_IpWhitelist, 'Expected to find IpWhitelist in response').toBeDefined();
        const item_PrCancellation = data.find((o: any) => o.id === Enums.FormMaster.PrCancellation || o.formCaption === 'PrCancellation');
        expect(item_PrCancellation, 'Expected to find PrCancellation in response').toBeDefined();
        const item_BacklogEntry = data.find((o: any) => o.id === Enums.FormMaster.BacklogEntry || o.formCaption === 'BacklogEntry');
        expect(item_BacklogEntry, 'Expected to find BacklogEntry in response').toBeDefined();
        const item_HealthCheck = data.find((o: any) => o.id === Enums.FormMaster.HealthCheck || o.formCaption === 'HealthCheck');
        expect(item_HealthCheck, 'Expected to find HealthCheck in response').toBeDefined();
        const item_UserAccessControl = data.find((o: any) => o.id === Enums.FormMaster.UserAccessControl || o.formCaption === 'UserAccessControl');
        expect(item_UserAccessControl, 'Expected to find UserAccessControl in response').toBeDefined();
        const item_UserMaster = data.find((o: any) => o.id === Enums.FormMaster.UserMaster || o.formCaption === 'UserMaster');
        expect(item_UserMaster, 'Expected to find UserMaster in response').toBeDefined();
        const item_RoleMaster = data.find((o: any) => o.id === Enums.FormMaster.RoleMaster || o.formCaption === 'RoleMaster');
        expect(item_RoleMaster, 'Expected to find RoleMaster in response').toBeDefined();
        const item_SupplierAccountMaster = data.find((o: any) => o.id === Enums.FormMaster.SupplierAccountMaster || o.formCaption === 'SupplierAccountMaster');
        expect(item_SupplierAccountMaster, 'Expected to find SupplierAccountMaster in response').toBeDefined();
        const item_PurchaseRequestApproval = data.find((o: any) => o.id === Enums.FormMaster.PurchaseRequestApproval || o.formCaption === 'PurchaseRequestApproval');
        expect(item_PurchaseRequestApproval, 'Expected to find PurchaseRequestApproval in response').toBeDefined();
        const item_PurchaseOrderApproval = data.find((o: any) => o.id === Enums.FormMaster.PurchaseOrderApproval || o.formCaption === 'PurchaseOrderApproval');
        expect(item_PurchaseOrderApproval, 'Expected to find PurchaseOrderApproval in response').toBeDefined();
        const item_RequestForQuotationApproval = data.find((o: any) => o.id === Enums.FormMaster.RequestForQuotationApproval || o.formCaption === 'RequestForQuotationApproval');
        expect(item_RequestForQuotationApproval, 'Expected to find RequestForQuotationApproval in response').toBeDefined();
        const item_ComparativeStatementApproval = data.find((o: any) => o.id === Enums.FormMaster.ComparativeStatementApproval || o.formCaption === 'ComparativeStatementApproval');
        expect(item_ComparativeStatementApproval, 'Expected to find ComparativeStatementApproval in response').toBeDefined();
        const item_Enquiry = data.find((o: any) => o.id === Enums.FormMaster.Enquiry || o.formCaption === 'Enquiry');
        expect(item_Enquiry, 'Expected to find Enquiry in response').toBeDefined();
        const item_PurchaseRequestAudit = data.find((o: any) => o.id === Enums.FormMaster.PurchaseRequestAudit || o.formCaption === 'PurchaseRequestAudit');
        expect(item_PurchaseRequestAudit, 'Expected to find PurchaseRequestAudit in response').toBeDefined();
        const item_PurchaseOrderAudit = data.find((o: any) => o.id === Enums.FormMaster.PurchaseOrderAudit || o.formCaption === 'PurchaseOrderAudit');
        expect(item_PurchaseOrderAudit, 'Expected to find PurchaseOrderAudit in response').toBeDefined();
        const item_RequestForQuotationAudit = data.find((o: any) => o.id === Enums.FormMaster.RequestForQuotationAudit || o.formCaption === 'RequestForQuotationAudit');
        expect(item_RequestForQuotationAudit, 'Expected to find RequestForQuotationAudit in response').toBeDefined();
        const item_ComparativeStatementAudit = data.find((o: any) => o.id === Enums.FormMaster.ComparativeStatementAudit || o.formCaption === 'ComparativeStatementAudit');
        expect(item_ComparativeStatementAudit, 'Expected to find ComparativeStatementAudit in response').toBeDefined();
        const item_CreateAuction = data.find((o: any) => o.id === Enums.FormMaster.CreateAuction || o.formCaption === 'CreateAuction');
        expect(item_CreateAuction, 'Expected to find CreateAuction in response').toBeDefined();
        const item_Budget = data.find((o: any) => o.id === Enums.FormMaster.Budget || o.formCaption === 'Budget');
        expect(item_Budget, 'Expected to find Budget in response').toBeDefined();
    });

    test('should return 200 and match enum values for formsMenu', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('formsMenu');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // No enum mapping found for formsMenu, verifying data exists
        expect(data.length).toBeGreaterThan(0);
    });

    test('should return 200 and match enum values for freightRateType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('freightRateType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Fixed = data.find((o: any) => o.id === Enums.FreightRateType.Fixed || o.freightRateTypeName === 'Fixed');
        expect(item_Fixed, 'Expected to find Fixed in response').toBeDefined();
        const item_PerUnit = data.find((o: any) => o.id === Enums.FreightRateType.PerUnit || o.freightRateTypeName === 'PerUnit');
        expect(item_PerUnit, 'Expected to find PerUnit in response').toBeDefined();
        const item_PerTrip = data.find((o: any) => o.id === Enums.FreightRateType.PerTrip || o.freightRateTypeName === 'PerTrip');
        expect(item_PerTrip, 'Expected to find PerTrip in response').toBeDefined();
    });

    test('should return 200 and match enum values for freightType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('freightType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_FOR = data.find((o: any) => o.id === Enums.FreightType.FOR || o.freightTypeName === 'FOR');
        expect(item_FOR, 'Expected to find FOR in response').toBeDefined();
        const item_TOPAY = data.find((o: any) => o.id === Enums.FreightType.TOPAY || o.freightTypeName === 'TOPAY');
        expect(item_TOPAY, 'Expected to find TOPAY in response').toBeDefined();
    });

    test('should return 200 and match enum values for gstCategory', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('gstCategory');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_GstRelavant = data.find((o: any) => o.id === Enums.GstCategory.GstRelavant || o.gstCategoryName === 'GstRelavant');
        expect(item_GstRelavant, 'Expected to find GstRelavant in response').toBeDefined();
        const item_NonGst = data.find((o: any) => o.id === Enums.GstCategory.NonGst || o.gstCategoryName === 'NonGst');
        expect(item_NonGst, 'Expected to find NonGst in response').toBeDefined();
        const item_GstExempted = data.find((o: any) => o.id === Enums.GstCategory.GstExempted || o.gstCategoryName === 'GstExempted');
        expect(item_GstExempted, 'Expected to find GstExempted in response').toBeDefined();
        const item_GstRelevantNegative = data.find((o: any) => o.id === Enums.GstCategory.GstRelevantNegative || o.gstCategoryName === 'GstRelevantNegative');
        expect(item_GstRelevantNegative, 'Expected to find GstRelevantNegative in response').toBeDefined();
    });

    test('should return 200 and match enum values for gstRegType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('gstRegType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_FullGstRegistered = data.find((o: any) => o.id === Enums.GstRegType.FullGstRegistered || o.gstRegTypeName === 'FullGstRegistered');
        expect(item_FullGstRegistered, 'Expected to find FullGstRegistered in response').toBeDefined();
        const item_FullGstPsu = data.find((o: any) => o.id === Enums.GstRegType.FullGstPsu || o.gstRegTypeName === 'FullGstPsu');
        expect(item_FullGstPsu, 'Expected to find FullGstPsu in response').toBeDefined();
        const item_GstExempt = data.find((o: any) => o.id === Enums.GstRegType.GstExempt || o.gstRegTypeName === 'GstExempt');
        expect(item_GstExempt, 'Expected to find GstExempt in response').toBeDefined();
        const item_GstCompounding = data.find((o: any) => o.id === Enums.GstRegType.GstCompounding || o.gstRegTypeName === 'GstCompounding');
        expect(item_GstCompounding, 'Expected to find GstCompounding in response').toBeDefined();
        const item_UnRegistered = data.find((o: any) => o.id === Enums.GstRegType.UnRegistered || o.gstRegTypeName === 'UnRegistered');
        expect(item_UnRegistered, 'Expected to find UnRegistered in response').toBeDefined();
        const item_Foreign = data.find((o: any) => o.id === Enums.GstRegType.Foreign || o.gstRegTypeName === 'Foreign');
        expect(item_Foreign, 'Expected to find Foreign in response').toBeDefined();
        const item_NA = data.find((o: any) => o.id === Enums.GstRegType.NA || o.gstRegTypeName === 'NA');
        expect(item_NA, 'Expected to find NA in response').toBeDefined();
    });

    test('should return 200 and match enum values for makeMgmtType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('makeMgmtType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_All = data.find((o: any) => o.id === Enums.MakeMgmtType.All || o.makeMgmtTypeName === 'All');
        expect(item_All, 'Expected to find All in response').toBeDefined();
        const item_Selected = data.find((o: any) => o.id === Enums.MakeMgmtType.Selected || o.makeMgmtTypeName === 'Selected');
        expect(item_Selected, 'Expected to find Selected in response').toBeDefined();
        const item_None = data.find((o: any) => o.id === Enums.MakeMgmtType.None || o.makeMgmtTypeName === 'None');
        expect(item_None, 'Expected to find None in response').toBeDefined();
    });

    test('should return 200 and match enum values for msmeType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('msmeType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Registered = data.find((o: any) => o.id === Enums.MsmeType.Registered || o.msmeTypeName === 'Registered');
        expect(item_Registered, 'Expected to find Registered in response').toBeDefined();
        const item_UnRegistered = data.find((o: any) => o.id === Enums.MsmeType.UnRegistered || o.msmeTypeName === 'UnRegistered');
        expect(item_UnRegistered, 'Expected to find UnRegistered in response').toBeDefined();
        const item_NA = data.find((o: any) => o.id === Enums.MsmeType.NA || o.msmeTypeName === 'NA');
        expect(item_NA, 'Expected to find NA in response').toBeDefined();
    });

    test('should return 200 and match enum values for negotiationOn', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('negotiationOn');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_DiscountPercentage = data.find((o: any) => o.id === Enums.NegotiationOn.DiscountPercentage || o.name === 'DiscountPercentage');
        expect(item_DiscountPercentage, 'Expected to find DiscountPercentage in response').toBeDefined();
        const item_DiscountAmount = data.find((o: any) => o.id === Enums.NegotiationOn.DiscountAmount || o.name === 'DiscountAmount');
        expect(item_DiscountAmount, 'Expected to find DiscountAmount in response').toBeDefined();
        const item_BasicAmount = data.find((o: any) => o.id === Enums.NegotiationOn.BasicAmount || o.name === 'BasicAmount');
        expect(item_BasicAmount, 'Expected to find BasicAmount in response').toBeDefined();
    });

    test('should return 200 and match enum values for notificationChannel', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('notificationChannel');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Email = data.find((o: any) => o.id === Enums.NotificationChannel.Email || o.notificationChannelName === 'Email');
        expect(item_Email, 'Expected to find Email in response').toBeDefined();
        const item_Sms = data.find((o: any) => o.id === Enums.NotificationChannel.Sms || o.notificationChannelName === 'Sms');
        expect(item_Sms, 'Expected to find Sms in response').toBeDefined();
        const item_Whatsapp = data.find((o: any) => o.id === Enums.NotificationChannel.Whatsapp || o.notificationChannelName === 'Whatsapp');
        expect(item_Whatsapp, 'Expected to find Whatsapp in response').toBeDefined();
    });

    test('should return 200 and match enum values for ownership', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('ownership');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Own = data.find((o: any) => o.id === Enums.Ownership.Own || o.ownershipName === 'Own');
        expect(item_Own, 'Expected to find Own in response').toBeDefined();
        const item_Party = data.find((o: any) => o.id === Enums.Ownership.Party || o.ownershipName === 'Party');
        expect(item_Party, 'Expected to find Party in response').toBeDefined();
    });

    test('should return 200 and match enum values for paymentMode', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('paymentMode');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Cash = data.find((o: any) => o.id === Enums.PaymentMode.Cash || o.paymentModeName === 'Cash');
        expect(item_Cash, 'Expected to find Cash in response').toBeDefined();
        const item_DD = data.find((o: any) => o.id === Enums.PaymentMode.DD || o.paymentModeName === 'DD');
        expect(item_DD, 'Expected to find DD in response').toBeDefined();
        const item_NEFT = data.find((o: any) => o.id === Enums.PaymentMode.NEFT || o.paymentModeName === 'NEFT');
        expect(item_NEFT, 'Expected to find NEFT in response').toBeDefined();
        const item_RTGS = data.find((o: any) => o.id === Enums.PaymentMode.RTGS || o.paymentModeName === 'RTGS');
        expect(item_RTGS, 'Expected to find RTGS in response').toBeDefined();
        const item_Cheque = data.find((o: any) => o.id === Enums.PaymentMode.Cheque || o.paymentModeName === 'Cheque');
        expect(item_Cheque, 'Expected to find Cheque in response').toBeDefined();
        const item_LC = data.find((o: any) => o.id === Enums.PaymentMode.LC || o.paymentModeName === 'LC');
        expect(item_LC, 'Expected to find LC in response').toBeDefined();
        const item_NeftThroughCheque = data.find((o: any) => o.id === Enums.PaymentMode.NeftThroughCheque || o.paymentModeName === 'NeftThroughCheque');
        expect(item_NeftThroughCheque, 'Expected to find NeftThroughCheque in response').toBeDefined();
        const item_RtgsThroughCheque = data.find((o: any) => o.id === Enums.PaymentMode.RtgsThroughCheque || o.paymentModeName === 'RtgsThroughCheque');
        expect(item_RtgsThroughCheque, 'Expected to find RtgsThroughCheque in response').toBeDefined();
        const item_BG = data.find((o: any) => o.id === Enums.PaymentMode.BG || o.paymentModeName === 'BG');
        expect(item_BG, 'Expected to find BG in response').toBeDefined();
        const item_Advance = data.find((o: any) => o.id === Enums.PaymentMode.Advance || o.paymentModeName === 'Advance');
        expect(item_Advance, 'Expected to find Advance in response').toBeDefined();
        const item_NextDayPayment = data.find((o: any) => o.id === Enums.PaymentMode.NextDayPayment || o.paymentModeName === 'NextDayPayment');
        expect(item_NextDayPayment, 'Expected to find NextDayPayment in response').toBeDefined();
        const item_OnCredit = data.find((o: any) => o.id === Enums.PaymentMode.OnCredit || o.paymentModeName === 'OnCredit');
        expect(item_OnCredit, 'Expected to find OnCredit in response').toBeDefined();
        const item_AgainstPDC = data.find((o: any) => o.id === Enums.PaymentMode.AgainstPDC || o.paymentModeName === 'AgainstPDC');
        expect(item_AgainstPDC, 'Expected to find AgainstPDC in response').toBeDefined();
        const item_SAdvance = data.find((o: any) => o.id === Enums.PaymentMode.SAdvance || o.paymentModeName === 'SAdvance');
        expect(item_SAdvance, 'Expected to find SAdvance in response').toBeDefined();
        const item_SightLC = data.find((o: any) => o.id === Enums.PaymentMode.SightLC || o.paymentModeName === 'SightLC');
        expect(item_SightLC, 'Expected to find SightLC in response').toBeDefined();
        const item_Mixed = data.find((o: any) => o.id === Enums.PaymentMode.Mixed || o.paymentModeName === 'Mixed');
        expect(item_Mixed, 'Expected to find Mixed in response').toBeDefined();
    });

    test('should return 200 and match enum values for paymentType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('paymentType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_DownPayment = data.find((o: any) => o.id === Enums.PaymentType.DownPayment || o.paymentTypeName === 'DownPayment');
        expect(item_DownPayment, 'Expected to find DownPayment in response').toBeDefined();
        const item_DownPaymentPI = data.find((o: any) => o.id === Enums.PaymentType.DownPaymentPI || o.paymentTypeName === 'DownPaymentPI');
        expect(item_DownPaymentPI, 'Expected to find DownPaymentPI in response').toBeDefined();
        const item_AgainstBill = data.find((o: any) => o.id === Enums.PaymentType.AgainstBill || o.paymentTypeName === 'AgainstBill');
        expect(item_AgainstBill, 'Expected to find AgainstBill in response').toBeDefined();
    });

    test('should return 200 and match enum values for payOn', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('payOn');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_BasicAmount = data.find((o: any) => o.id === Enums.PayOn.BasicAmount || o.payOnName === 'BasicAmount');
        expect(item_BasicAmount, 'Expected to find BasicAmount in response').toBeDefined();
        const item_NetAmount = data.find((o: any) => o.id === Enums.PayOn.NetAmount || o.payOnName === 'NetAmount');
        expect(item_NetAmount, 'Expected to find NetAmount in response').toBeDefined();
        const item_BalanceAmount = data.find((o: any) => o.id === Enums.PayOn.BalanceAmount || o.payOnName === 'BalanceAmount');
        expect(item_BalanceAmount, 'Expected to find BalanceAmount in response').toBeDefined();
    });

    test('should return 200 and match enum values for purchaseType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('purchaseType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Capital = data.find((o: any) => o.id === Enums.PurchaseType.Capital || o.purchaseTypeName === 'Capital');
        expect(item_Capital, 'Expected to find Capital in response').toBeDefined();
        const item_General = data.find((o: any) => o.id === Enums.PurchaseType.General || o.purchaseTypeName === 'General');
        expect(item_General, 'Expected to find General in response').toBeDefined();
    });

    test('should return 200 and match enum values for reasonType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('reasonType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // No enum mapping found for reasonType, verifying data exists
        expect(data.length).toBeGreaterThan(0);
    });

    test('should return 200 and match enum values for refDocType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('refDocType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_DirectPR = data.find((o: any) => o.id === Enums.RefDocType.DirectPR || o.refDocTypeName === 'DirectPR');
        expect(item_DirectPR, 'Expected to find DirectPR in response').toBeDefined();
        const item_DirectPO = data.find((o: any) => o.id === Enums.RefDocType.DirectPO || o.refDocTypeName === 'DirectPO');
        expect(item_DirectPO, 'Expected to find DirectPO in response').toBeDefined();
        const item_PurchaseRequestPO = data.find((o: any) => o.id === Enums.RefDocType.PurchaseRequestPO || o.refDocTypeName === 'PurchaseRequestPO');
        expect(item_PurchaseRequestPO, 'Expected to find PurchaseRequestPO in response').toBeDefined();
        const item_QuotationPO = data.find((o: any) => o.id === Enums.RefDocType.QuotationPO || o.refDocTypeName === 'QuotationPO');
        expect(item_QuotationPO, 'Expected to find QuotationPO in response').toBeDefined();
        const item_DirectRFQ = data.find((o: any) => o.id === Enums.RefDocType.DirectRFQ || o.refDocTypeName === 'DirectRFQ');
        expect(item_DirectRFQ, 'Expected to find DirectRFQ in response').toBeDefined();
        const item_PurchaseRequestRFQ = data.find((o: any) => o.id === Enums.RefDocType.PurchaseRequestRFQ || o.refDocTypeName === 'PurchaseRequestRFQ');
        expect(item_PurchaseRequestRFQ, 'Expected to find PurchaseRequestRFQ in response').toBeDefined();
        const item_RfqCS = data.find((o: any) => o.id === Enums.RefDocType.RfqCS || o.refDocTypeName === 'RfqCS');
        expect(item_RfqCS, 'Expected to find RfqCS in response').toBeDefined();
        const item_CsCS = data.find((o: any) => o.id === Enums.RefDocType.CsCS || o.refDocTypeName === 'CsCS');
        expect(item_CsCS, 'Expected to find CsCS in response').toBeDefined();
        const item_AuctionRFQ = data.find((o: any) => o.id === Enums.RefDocType.AuctionRFQ || o.refDocTypeName === 'AuctionRFQ');
        expect(item_AuctionRFQ, 'Expected to find AuctionRFQ in response').toBeDefined();
        const item_DirectAuction = data.find((o: any) => o.id === Enums.RefDocType.DirectAuction || o.refDocTypeName === 'DirectAuction');
        expect(item_DirectAuction, 'Expected to find DirectAuction in response').toBeDefined();
        const item_RfqAuction = data.find((o: any) => o.id === Enums.RefDocType.RfqAuction || o.refDocTypeName === 'RfqAuction');
        expect(item_RfqAuction, 'Expected to find RfqAuction in response').toBeDefined();
    });

    test('should return 200 and match enum values for regionSetup', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('regionSetup');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_IndiaWithGST = data.find((o: any) => o.id === Enums.RegionSetup.IndiaWithGST || o.name === 'IndiaWithGST');
        expect(item_IndiaWithGST, 'Expected to find IndiaWithGST in response').toBeDefined();
        const item_IndiaWithoutGST = data.find((o: any) => o.id === Enums.RegionSetup.IndiaWithoutGST || o.name === 'IndiaWithoutGST');
        expect(item_IndiaWithoutGST, 'Expected to find IndiaWithoutGST in response').toBeDefined();
        const item_Other = data.find((o: any) => o.id === Enums.RegionSetup.Other || o.name === 'Other');
        expect(item_Other, 'Expected to find Other in response').toBeDefined();
    });

    test('should return 200 and match enum values for reports', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('reports');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // No enum mapping found for reports, verifying data exists
        expect(data.length).toBeGreaterThan(0);
    });

    test('should return 200 and match enum values for selectionCriteria', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('selectionCriteria');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Lowest = data.find((o: any) => o.id === Enums.SelectionCriteria.Lowest || o.selectionCriteriaName === 'Lowest');
        expect(item_Lowest, 'Expected to find Lowest in response').toBeDefined();
        const item_HighestWise = data.find((o: any) => o.id === Enums.SelectionCriteria.HighestWise || o.selectionCriteriaName === 'HighestWise');
        expect(item_HighestWise, 'Expected to find HighestWise in response').toBeDefined();
    });

    test('should return 200 and match enum values for selectionPolicy', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('selectionPolicy');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Hide = data.find((o: any) => o.id === Enums.SelectionPolicy.Hide || o.selectionPolicyName === 'Hide');
        expect(item_Hide, 'Expected to find Hide in response').toBeDefined();
        const item_Optional = data.find((o: any) => o.id === Enums.SelectionPolicy.Optional || o.selectionPolicyName === 'Optional');
        expect(item_Optional, 'Expected to find Optional in response').toBeDefined();
        const item_Mandatory = data.find((o: any) => o.id === Enums.SelectionPolicy.Mandatory || o.selectionPolicyName === 'Mandatory');
        expect(item_Mandatory, 'Expected to find Mandatory in response').toBeDefined();
    });

    test('should return 200 and match enum values for selectionType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('selectionType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_All = data.find((o: any) => o.id === Enums.SelectionType.All || o.selectionTypeName === 'All');
        expect(item_All, 'Expected to find All in response').toBeDefined();
        const item_Selected = data.find((o: any) => o.id === Enums.SelectionType.Selected || o.selectionTypeName === 'Selected');
        expect(item_Selected, 'Expected to find Selected in response').toBeDefined();
    });

    test('should return 200 and match enum values for status', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('status');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Active = data.find((o: any) => o.id === Enums.Status.Active || o.statusName === 'Active');
        expect(item_Active, 'Expected to find Active in response').toBeDefined();
        const item_Inactive = data.find((o: any) => o.id === Enums.Status.Inactive || o.statusName === 'Inactive');
        expect(item_Inactive, 'Expected to find Inactive in response').toBeDefined();
        const item_Pending = data.find((o: any) => o.id === Enums.Status.Pending || o.statusName === 'Pending');
        expect(item_Pending, 'Expected to find Pending in response').toBeDefined();
        const item_Verified = data.find((o: any) => o.id === Enums.Status.Verified || o.statusName === 'Verified');
        expect(item_Verified, 'Expected to find Verified in response').toBeDefined();
        const item_Expired = data.find((o: any) => o.id === Enums.Status.Expired || o.statusName === 'Expired');
        expect(item_Expired, 'Expected to find Expired in response').toBeDefined();
        const item_Suspended = data.find((o: any) => o.id === Enums.Status.Suspended || o.statusName === 'Suspended');
        expect(item_Suspended, 'Expected to find Suspended in response').toBeDefined();
        const item_Draft = data.find((o: any) => o.id === Enums.Status.Draft || o.statusName === 'Draft');
        expect(item_Draft, 'Expected to find Draft in response').toBeDefined();
        const item_Received = data.find((o: any) => o.id === Enums.Status.Received || o.statusName === 'Received');
        expect(item_Received, 'Expected to find Received in response').toBeDefined();
        const item_Authorize = data.find((o: any) => o.id === Enums.Status.Authorize || o.statusName === 'Authorize');
        expect(item_Authorize, 'Expected to find Authorize in response').toBeDefined();
        const item_InProgress = data.find((o: any) => o.id === Enums.Status.InProgress || o.statusName === 'InProgress');
        expect(item_InProgress, 'Expected to find InProgress in response').toBeDefined();
        const item_Completed = data.find((o: any) => o.id === Enums.Status.Completed || o.statusName === 'Completed');
        expect(item_Completed, 'Expected to find Completed in response').toBeDefined();
        const item_Approved = data.find((o: any) => o.id === Enums.Status.Approved || o.statusName === 'Approved');
        expect(item_Approved, 'Expected to find Approved in response').toBeDefined();
        const item_Rejected = data.find((o: any) => o.id === Enums.Status.Rejected || o.statusName === 'Rejected');
        expect(item_Rejected, 'Expected to find Rejected in response').toBeDefined();
        const item_InReview = data.find((o: any) => o.id === Enums.Status.InReview || o.statusName === 'InReview');
        expect(item_InReview, 'Expected to find InReview in response').toBeDefined();
        const item_Cancelled = data.find((o: any) => o.id === Enums.Status.Cancelled || o.statusName === 'Cancelled');
        expect(item_Cancelled, 'Expected to find Cancelled in response').toBeDefined();
        const item_ShortClosed = data.find((o: any) => o.id === Enums.Status.ShortClosed || o.statusName === 'ShortClosed');
        expect(item_ShortClosed, 'Expected to find ShortClosed in response').toBeDefined();
        const item_Hold = data.find((o: any) => o.id === Enums.Status.Hold || o.statusName === 'Hold');
        expect(item_Hold, 'Expected to find Hold in response').toBeDefined();
        const item_Blocked = data.find((o: any) => o.id === Enums.Status.Blocked || o.statusName === 'Blocked');
        expect(item_Blocked, 'Expected to find Blocked in response').toBeDefined();
        const item_Skipped = data.find((o: any) => o.id === Enums.Status.Skipped || o.statusName === 'Skipped');
        expect(item_Skipped, 'Expected to find Skipped in response').toBeDefined();
        const item_NotAssigned = data.find((o: any) => o.id === Enums.Status.NotAssigned || o.statusName === 'NotAssigned');
        expect(item_NotAssigned, 'Expected to find NotAssigned in response').toBeDefined();
        const item_ApprovedByPeer = data.find((o: any) => o.id === Enums.Status.ApprovedByPeer || o.statusName === 'ApprovedByPeer');
        expect(item_ApprovedByPeer, 'Expected to find ApprovedByPeer in response').toBeDefined();
        const item_Decline = data.find((o: any) => o.id === Enums.Status.Decline || o.statusName === 'Decline');
        expect(item_Decline, 'Expected to find Decline in response').toBeDefined();
        const item_Viewed = data.find((o: any) => o.id === Enums.Status.Viewed || o.statusName === 'Viewed');
        expect(item_Viewed, 'Expected to find Viewed in response').toBeDefined();
        const item_Withdraw = data.find((o: any) => o.id === Enums.Status.Withdraw || o.statusName === 'Withdraw');
        expect(item_Withdraw, 'Expected to find Withdraw in response').toBeDefined();
        const item_New = data.find((o: any) => o.id === Enums.Status.New || o.statusName === 'New');
        expect(item_New, 'Expected to find New in response').toBeDefined();
        const item_ForceLogout = data.find((o: any) => o.id === Enums.Status.ForceLogout || o.statusName === 'ForceLogout');
        expect(item_ForceLogout, 'Expected to find ForceLogout in response').toBeDefined();
        const item_Failed = data.find((o: any) => o.id === Enums.Status.Failed || o.statusName === 'Failed');
        expect(item_Failed, 'Expected to find Failed in response').toBeDefined();
        const item_LoggedOut = data.find((o: any) => o.id === Enums.Status.LoggedOut || o.statusName === 'LoggedOut');
        expect(item_LoggedOut, 'Expected to find LoggedOut in response').toBeDefined();
        const item_RejectedByPeer = data.find((o: any) => o.id === Enums.Status.RejectedByPeer || o.statusName === 'RejectedByPeer');
        expect(item_RejectedByPeer, 'Expected to find RejectedByPeer in response').toBeDefined();
    });

    test('should return 200 and match enum values for supplyType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('supplyType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Intrastate = data.find((o: any) => o.id === Enums.SupplyType.Intrastate || o.supplyTypeName === 'Intrastate');
        expect(item_Intrastate, 'Expected to find Intrastate in response').toBeDefined();
        const item_InterState = data.find((o: any) => o.id === Enums.SupplyType.InterState || o.supplyTypeName === 'InterState');
        expect(item_InterState, 'Expected to find InterState in response').toBeDefined();
    });

    test('should return 200 and match enum values for taxCategory', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('taxCategory');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Discount = data.find((o: any) => o.id === Enums.TaxCategory.Discount || o.taxCategoryName === 'Discount');
        expect(item_Discount, 'Expected to find Discount in response').toBeDefined();
        const item_GST = data.find((o: any) => o.id === Enums.TaxCategory.GST || o.taxCategoryName === 'GST');
        expect(item_GST, 'Expected to find GST in response').toBeDefined();
        const item_Other = data.find((o: any) => o.id === Enums.TaxCategory.Other || o.taxCategoryName === 'Other');
        expect(item_Other, 'Expected to find Other in response').toBeDefined();
        const item_Freight = data.find((o: any) => o.id === Enums.TaxCategory.Freight || o.taxCategoryName === 'Freight');
        expect(item_Freight, 'Expected to find Freight in response').toBeDefined();
        const item_TCS = data.find((o: any) => o.id === Enums.TaxCategory.TCS || o.taxCategoryName === 'TCS');
        expect(item_TCS, 'Expected to find TCS in response').toBeDefined();
        const item_RoundingAdjustment = data.find((o: any) => o.id === Enums.TaxCategory.RoundingAdjustment || o.taxCategoryName === 'RoundingAdjustment');
        expect(item_RoundingAdjustment, 'Expected to find RoundingAdjustment in response').toBeDefined();
        const item_Insurance = data.find((o: any) => o.id === Enums.TaxCategory.Insurance || o.taxCategoryName === 'Insurance');
        expect(item_Insurance, 'Expected to find Insurance in response').toBeDefined();
        const item_LoadingUnloading = data.find((o: any) => o.id === Enums.TaxCategory.LoadingUnloading || o.taxCategoryName === 'LoadingUnloading');
        expect(item_LoadingUnloading, 'Expected to find LoadingUnloading in response').toBeDefined();
    });

    test('should return 200 and match enum values for taxGroup', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('taxGroup');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_CentralGST = data.find((o: any) => o.id === Enums.TaxGroup.CentralGST || o.taxGroupName === 'CentralGST');
        expect(item_CentralGST, 'Expected to find CentralGST in response').toBeDefined();
        const item_StateGST = data.find((o: any) => o.id === Enums.TaxGroup.StateGST || o.taxGroupName === 'StateGST');
        expect(item_StateGST, 'Expected to find StateGST in response').toBeDefined();
        const item_IntegratedGST = data.find((o: any) => o.id === Enums.TaxGroup.IntegratedGST || o.taxGroupName === 'IntegratedGST');
        expect(item_IntegratedGST, 'Expected to find IntegratedGST in response').toBeDefined();
        const item_UtGST = data.find((o: any) => o.id === Enums.TaxGroup.UtGST || o.taxGroupName === 'UtGST');
        expect(item_UtGST, 'Expected to find UtGST in response').toBeDefined();
        const item_CessGST = data.find((o: any) => o.id === Enums.TaxGroup.CessGST || o.taxGroupName === 'CessGST');
        expect(item_CessGST, 'Expected to find CessGST in response').toBeDefined();
        const item_Discount = data.find((o: any) => o.id === Enums.TaxGroup.Discount || o.taxGroupName === 'Discount');
        expect(item_Discount, 'Expected to find Discount in response').toBeDefined();
        const item_OtherPlus = data.find((o: any) => o.id === Enums.TaxGroup.OtherPlus || o.taxGroupName === 'OtherPlus');
        expect(item_OtherPlus, 'Expected to find OtherPlus in response').toBeDefined();
        const item_FreightTaxable = data.find((o: any) => o.id === Enums.TaxGroup.FreightTaxable || o.taxGroupName === 'FreightTaxable');
        expect(item_FreightTaxable, 'Expected to find FreightTaxable in response').toBeDefined();
        const item_TCS = data.find((o: any) => o.id === Enums.TaxGroup.TCS || o.taxGroupName === 'TCS');
        expect(item_TCS, 'Expected to find TCS in response').toBeDefined();
        const item_RoundingAdjustmentPlus = data.find((o: any) => o.id === Enums.TaxGroup.RoundingAdjustmentPlus || o.taxGroupName === 'RoundingAdjustmentPlus');
        expect(item_RoundingAdjustmentPlus, 'Expected to find RoundingAdjustmentPlus in response').toBeDefined();
        const item_Insurance = data.find((o: any) => o.id === Enums.TaxGroup.Insurance || o.taxGroupName === 'Insurance');
        expect(item_Insurance, 'Expected to find Insurance in response').toBeDefined();
        const item_FreightNonTaxable = data.find((o: any) => o.id === Enums.TaxGroup.FreightNonTaxable || o.taxGroupName === 'FreightNonTaxable');
        expect(item_FreightNonTaxable, 'Expected to find FreightNonTaxable in response').toBeDefined();
        const item_OtherMinus = data.find((o: any) => o.id === Enums.TaxGroup.OtherMinus || o.taxGroupName === 'OtherMinus');
        expect(item_OtherMinus, 'Expected to find OtherMinus in response').toBeDefined();
        const item_RoundingAdjustmentMinus = data.find((o: any) => o.id === Enums.TaxGroup.RoundingAdjustmentMinus || o.taxGroupName === 'RoundingAdjustmentMinus');
        expect(item_RoundingAdjustmentMinus, 'Expected to find RoundingAdjustmentMinus in response').toBeDefined();
        const item_LoadingUnloading = data.find((o: any) => o.id === Enums.TaxGroup.LoadingUnloading || o.taxGroupName === 'LoadingUnloading');
        expect(item_LoadingUnloading, 'Expected to find LoadingUnloading in response').toBeDefined();
    });

    test('should return 200 and match enum values for taxNature', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('taxNature');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Percentage = data.find((o: any) => o.id === Enums.TaxNature.Percentage || o.taxNatureName === 'Percentage');
        expect(item_Percentage, 'Expected to find Percentage in response').toBeDefined();
        const item_Amount = data.find((o: any) => o.id === Enums.TaxNature.Amount || o.taxNatureName === 'Amount');
        expect(item_Amount, 'Expected to find Amount in response').toBeDefined();
        const item_OnUnit = data.find((o: any) => o.id === Enums.TaxNature.OnUnit || o.taxNatureName === 'OnUnit');
        expect(item_OnUnit, 'Expected to find OnUnit in response').toBeDefined();
    });

    test('should return 200 and match enum values for toleranceType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('toleranceType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Quantity = data.find((o: any) => o.id === Enums.ToleranceType.Quantity || o.toleranceTypeName === 'Quantity');
        expect(item_Quantity, 'Expected to find Quantity in response').toBeDefined();
        const item_Percentage = data.find((o: any) => o.id === Enums.ToleranceType.Percentage || o.toleranceTypeName === 'Percentage');
        expect(item_Percentage, 'Expected to find Percentage in response').toBeDefined();
    });

    test('should return 200 and match enum values for transportationRouteLevel', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('transportationRouteLevel');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_DocumentWise = data.find((o: any) => o.id === Enums.TransportationRouteLevel.DocumentWise || o.transportationRouteLevelName === 'DocumentWise');
        expect(item_DocumentWise, 'Expected to find DocumentWise in response').toBeDefined();
        const item_ItemWise = data.find((o: any) => o.id === Enums.TransportationRouteLevel.ItemWise || o.transportationRouteLevelName === 'ItemWise');
        expect(item_ItemWise, 'Expected to find ItemWise in response').toBeDefined();
    });

    test('should return 200 and match enum values for unitConversionType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('unitConversionType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Fixed = data.find((o: any) => o.id === Enums.UnitConversionType.Fixed || o.unitConversionTypeName === 'Fixed');
        expect(item_Fixed, 'Expected to find Fixed in response').toBeDefined();
        const item_Variant = data.find((o: any) => o.id === Enums.UnitConversionType.Variant || o.unitConversionTypeName === 'Variant');
        expect(item_Variant, 'Expected to find Variant in response').toBeDefined();
    });

    test('should return 200 and match enum values for userType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('userType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_CompanyAdmin = data.find((o: any) => o.id === Enums.UserType.CompanyAdmin || o.userTypeName === 'CompanyAdmin');
        expect(item_CompanyAdmin, 'Expected to find CompanyAdmin in response').toBeDefined();
        const item_CompanyGeneral = data.find((o: any) => o.id === Enums.UserType.CompanyGeneral || o.userTypeName === 'CompanyGeneral');
        expect(item_CompanyGeneral, 'Expected to find CompanyGeneral in response').toBeDefined();
        const item_Supplier = data.find((o: any) => o.id === Enums.UserType.Supplier || o.userTypeName === 'Supplier');
        expect(item_Supplier, 'Expected to find Supplier in response').toBeDefined();
    });

    test('should return 200 and match enum values for vehicleType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('vehicleType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Truck = data.find((o: any) => o.id === Enums.VehicleType.Truck || o.vehicleTypeName === 'Truck');
        expect(item_Truck, 'Expected to find Truck in response').toBeDefined();
        const item_Dumper = data.find((o: any) => o.id === Enums.VehicleType.Dumper || o.vehicleTypeName === 'Dumper');
        expect(item_Dumper, 'Expected to find Dumper in response').toBeDefined();
        const item_Auto = data.find((o: any) => o.id === Enums.VehicleType.Auto || o.vehicleTypeName === 'Auto');
        expect(item_Auto, 'Expected to find Auto in response').toBeDefined();
        const item_Trailer = data.find((o: any) => o.id === Enums.VehicleType.Trailer || o.vehicleTypeName === 'Trailer');
        expect(item_Trailer, 'Expected to find Trailer in response').toBeDefined();
        const item_Normal = data.find((o: any) => o.id === Enums.VehicleType.Normal || o.vehicleTypeName === 'Normal');
        expect(item_Normal, 'Expected to find Normal in response').toBeDefined();
        const item_RailwayRake = data.find((o: any) => o.id === Enums.VehicleType.RailwayRake || o.vehicleTypeName === 'RailwayRake');
        expect(item_RailwayRake, 'Expected to find RailwayRake in response').toBeDefined();
        const item_BUS = data.find((o: any) => o.id === Enums.VehicleType.BUS || o.vehicleTypeName === 'BUS');
        expect(item_BUS, 'Expected to find BUS in response').toBeDefined();
        const item_Tanker = data.find((o: any) => o.id === Enums.VehicleType.Tanker || o.vehicleTypeName === 'Tanker');
        expect(item_Tanker, 'Expected to find Tanker in response').toBeDefined();
        const item_ByCourier = data.find((o: any) => o.id === Enums.VehicleType.ByCourier || o.vehicleTypeName === 'ByCourier');
        expect(item_ByCourier, 'Expected to find ByCourier in response').toBeDefined();
        const item_ByRoad = data.find((o: any) => o.id === Enums.VehicleType.ByRoad || o.vehicleTypeName === 'ByRoad');
        expect(item_ByRoad, 'Expected to find ByRoad in response').toBeDefined();
        const item_ByShip = data.find((o: any) => o.id === Enums.VehicleType.ByShip || o.vehicleTypeName === 'ByShip');
        expect(item_ByShip, 'Expected to find ByShip in response').toBeDefined();
        const item_ByAirways = data.find((o: any) => o.id === Enums.VehicleType.ByAirways || o.vehicleTypeName === 'ByAirways');
        expect(item_ByAirways, 'Expected to find ByAirways in response').toBeDefined();
    });

    test('should return 200 and match enum values for vendorRatingPeriodType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('vendorRatingPeriodType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_Today = data.find((o: any) => o.id === Enums.VendorRatingPeriodType.Today || o.vendorRatingPeriodTypeName === 'Today');
        expect(item_Today, 'Expected to find Today in response').toBeDefined();
        const item_ThreeMonths = data.find((o: any) => o.id === Enums.VendorRatingPeriodType.ThreeMonths || o.vendorRatingPeriodTypeName === 'ThreeMonths');
        expect(item_ThreeMonths, 'Expected to find ThreeMonths in response').toBeDefined();
        const item_SixMonths = data.find((o: any) => o.id === Enums.VendorRatingPeriodType.SixMonths || o.vendorRatingPeriodTypeName === 'SixMonths');
        expect(item_SixMonths, 'Expected to find SixMonths in response').toBeDefined();
    });

    test('should return 200 and match enum values for vendorSelectionBasis', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('vendorSelectionBasis');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_QuotationItemWise = data.find((o: any) => o.id === Enums.VendorSelectionBasis.QuotationItemWise || o.vendorSelectionBasisName === 'QuotationItemWise');
        expect(item_QuotationItemWise, 'Expected to find QuotationItemWise in response').toBeDefined();
        const item_QuotationWise = data.find((o: any) => o.id === Enums.VendorSelectionBasis.QuotationWise || o.vendorSelectionBasisName === 'QuotationWise');
        expect(item_QuotationWise, 'Expected to find QuotationWise in response').toBeDefined();
    });

    test('should return 200 and match enum values for warehouseType', async ({ globalDataApiFactory }) => {
        const api = globalDataApiFactory('warehouseType');
        const response = await api.list();
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = Array.isArray(response.body) ? response.body : response.body.data;
        expect(Array.isArray(data)).toBeTruthy();

        // Verify enum values
        const item_InHouse = data.find((o: any) => o.id === Enums.WarehouseType.InHouse || o.warehouseTypeName === 'InHouse');
        expect(item_InHouse, 'Expected to find InHouse in response').toBeDefined();
        const item_External = data.find((o: any) => o.id === Enums.WarehouseType.External || o.warehouseTypeName === 'External');
        expect(item_External, 'Expected to find External in response').toBeDefined();
    });

});
