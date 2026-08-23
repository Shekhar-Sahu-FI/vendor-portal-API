import { test, expect } from '../../fixtures/apiFixtures';
import { unitData, groupData, subgroupData, makeData, businessTypeData, currencyData, cSReasonData, regionData, tNCHeadData, tNCGroupData, vendorCategoryData, priorityData, categoryData, itemData, countryData, stateData, cityData, locationData, companyData, companyLocationData, divisionData, departmentData, docTypeData, costCenterData, roleData, userData, supplierAccountData, vendorMasterData, expenseHeadData, vendorAttachmentData, documentSeriesData, paymentTermsGroupData, requestForQuotationData } from './masterData';


test.describe('Initial Data Setup', () => {

    test('should seed Unit Master initial data', async ({ unitApi, workflow }) => {
        await workflow.seedInitialData(unitApi, unitData, "");
    });

    test('should seed Group Master initial data', async ({ groupApi, workflow, lookup }) => {
        await workflow.seedInitialData(groupApi, groupData, "Group Master", async (payload) => {
            const category = await lookup.getRecord("category", payload.categoryName);
            return {
                ...payload,
                categoryId: category?.id,
                groupCode: category?.code + payload.code
            };
        });
    });

    test('should seed Subgroup Master initial data', async ({ subgroupApi, workflow, lookup }) => {
        await workflow.seedInitialData(subgroupApi, subgroupData, "Subgroup Master", async (payload) => {
            const group = await lookup.getRecord("group", payload.groupName);
            const unit = await lookup.getRecord("unit", payload.unitName);
            return {
                ...payload,
                groupId: group?.id,
                subgroupCode: group?.groupCode + payload.code,
                stockUnitId: unit?.id
            };
        });
    });

    test('should seed Make Master initial data', async ({ makeApi, workflow }) => {
        await workflow.seedInitialData(makeApi, makeData, "Make Master");
    });

    test('should seed BusinessType Master initial data', async ({ businessTypeApi, workflow }) => {
        await workflow.seedInitialData(businessTypeApi, businessTypeData, "BusinessType Master");
    });

    test('should seed Currency Master initial data', async ({ currencyApi, workflow }) => {
        await workflow.seedInitialData(currencyApi, currencyData, "Currency Master");
    });

    test('should seed CSReason Master initial data', async ({ cSReasonApi, workflow }) => {
        await workflow.seedInitialData(cSReasonApi, cSReasonData, "CSReason Master");
    });

    test('should seed Region Master initial data', async ({ regionApi, workflow }) => {
        await workflow.seedInitialData(regionApi, regionData, "Region Master");
    });

    test('should seed TNCHead Master initial data', async ({ tNCHeadApi, workflow }) => {
        await workflow.seedInitialData(tNCHeadApi, tNCHeadData, "TNCHead Master");
    });

    test('should seed TNC Group Master initial data', async ({ tNCGroupApi, workflow, lookup }) => {
        await workflow.seedInitialData(tNCGroupApi, tNCGroupData, "TNC Group Master", async (payload) => {
            const tncGroupHeadDetail = [];
            if (payload.tncGroupHeadDetail && payload.tncGroupHeadDetail.length > 0) {
                for (const detail of payload.tncGroupHeadDetail) {
                    const tncHead = await lookup.getRecord("termsAndConditionHead", detail.tncHeadName);
                    const { tncHeadName, ...restDetail } = detail;
                    tncGroupHeadDetail.push({
                        ...restDetail,
                        tncHeadId: tncHead?.id
                    });
                }
            }
            return {
                ...payload,
                tncGroupHeadDetail
            };
        });
    });

    test('should seed vendorCategory Master initial data', async ({ vendorCategoryApi, workflow }) => {
        await workflow.seedInitialData(vendorCategoryApi, vendorCategoryData, "vendorCategory Master");
    });

    test('should seed Priority Master initial data', async ({ priorityApi, workflow }) => {
        await workflow.seedInitialData(priorityApi, priorityData, "Priority Master");
    });

    test('should seed Category Master initial data', async ({ categoryApi, workflow }) => {
        await workflow.seedInitialData(categoryApi, categoryData, "Category Master");
    });

    test('should seed Item Master initial data', async ({ itemApi, workflow, lookup }) => {
        await workflow.seedInitialData(itemApi, itemData, "Item Master", async (payload) => {
            const unit = await lookup.getRecord("unit", payload.unitName);
            const subgroup = await lookup.getRecord("subgroup", payload.subgroupName);

            const unitConversionDetail = [];
            if (payload.unitConversionDetail) {
                for (const ucd of payload.unitConversionDetail) {
                    const toUnit = await lookup.getRecord("unit", ucd.tounitName);
                    const { tounitName, ...restUcd } = ucd;
                    unitConversionDetail.push({
                        ...restUcd,
                        toUnitId: toUnit?.id
                    });
                }
            }

            const itemSelectedMakeDetail = [];
            if (payload.itemSelectedMakeDetail) {
                for (const make of payload.itemSelectedMakeDetail) {
                    const makeRecord = await lookup.getRecord("make", make.makeName);
                    const { makeName, ...restMake } = make;
                    itemSelectedMakeDetail.push({
                        ...restMake,
                        makeId: makeRecord?.id
                    });
                }
            }

            return {
                ...payload,
                unitId: unit?.id,
                subgroupId: subgroup?.id,
                itemCode: subgroup?.subgroupCode + payload.code,
                unitConversionDetail,
                itemSelectedMakeDetail
            };
        });
    });

    test('should seed Country Master initial data', async ({ countryApi, workflow }) => {
        await workflow.seedInitialData(countryApi, countryData, "Country Master");
    });

    test('should seed State Master initial data', async ({ stateApi, workflow, lookup }) => {
        await workflow.seedInitialData(stateApi, stateData, "State Master", async (payload) => {
            const country = await lookup.getRecord("country", payload.countryName);
            return { ...payload, countryId: country?.id };
        });
    });

    test('should seed City Master initial data', async ({ cityApi, workflow, lookup }) => {
        await workflow.seedInitialData(cityApi, cityData, "City Master", async (payload) => {
            const state = await lookup.getState(payload.stateName, payload.countryName);
            return { ...payload, countryId: state?.countryId, stateId: state?.id };
        });
    });

    test('should seed Location Master initial data', async ({ locationApi, workflow, lookup }) => {
        await workflow.seedInitialData(locationApi, locationData, "Location Master", async (payload) => {
            const city = await lookup.getRecord("city", payload.cityName);
            return { ...payload, cityId: city?.id };
        });
    });

    test('should seed Company Master initial data', async ({ companyApi, workflow, lookup }) => {
        await workflow.seedInitialData(companyApi, companyData, "Company Master", async (payload) => {
            const state = await lookup.getState(payload.stateName, payload.countryName);
            const city = await lookup.getRecord("city", payload.cityName);
            return { ...payload, countryId: state?.countryId, stateId: state?.id, cityId: city?.id };
        });
    });

    test('should seed Company Location Master initial data', async ({ companyLocationApi, workflow, lookup }) => {
        await workflow.seedInitialData(companyLocationApi, companyLocationData, "Company Location Master", async (payload) => {
            const company = await lookup.getRecord("company", payload.companyName);
            const state = await lookup.getState(payload.stateName, payload.countryName);
            const city = await lookup.getRecord("city", payload.cityName);
            return { ...payload, companyId: company?.id, countryId: state?.countryId, stateId: state?.id, cityId: city?.id };
        });
    });

    test('should seed Division Master initial data', async ({ divisionApi, workflow, lookup }) => {
        await workflow.seedInitialData(divisionApi, divisionData, "Division Master", async (payload) => {
            const companyDetail = [];
            for (const companyObj of payload.companyDetail) {
                const company = await lookup.getRecord("company", companyObj.companyName);
                companyDetail.push({
                    companyId: company.id,
                    statusId: 1
                });
            }
            return {
                ...payload,
                companyDetail
            };
        });
    });

    test('should seed Department Master initial data', async ({ departmentApi, workflow, lookup }) => {
        await workflow.seedInitialData(departmentApi, departmentData, "Department Master", async (payload) => {
            const companyDetail = [];
            for (const companyObj of payload.departmentCompanyDivisionDetail) {
                const division = await lookup.searchDivision(companyObj.companyName, companyObj.divisionName);
                if (division) {
                    companyDetail.push({
                        companyId: division.companyId,
                        divisionId: division.id
                    });
                }
            }
            return {
                ...payload,
                departmentCompanyDivisionDetail: companyDetail
            };
        });
    });

    test('should seed DocType Master initial data', async ({ docTypeApi, workflow, lookup }) => {
        await workflow.seedInitialData(docTypeApi, docTypeData, "DocType Master", async (payload) => {
            const form = await lookup.getGlobalRecord("forms", payload.formName);
            const companyDetails = [];
            for (const item of payload.companyDetails) {
                const division = await lookup.searchDivision(item.companyName, item.divisionName);
                if (division) {
                    companyDetails.push({
                        companyId: division.companyId,
                        divisionId: division.id,
                        statusId: 1
                    });
                }
            }
            return {
                ...payload,
                formId: form?.id,
                companyDetails
            };
        });
    });

    test('should seed CostCenter Master initial data', async ({ costCenterApi, workflow, lookup }) => {
        await workflow.seedInitialData(costCenterApi, costCenterData, "CostCenter Master", async (payload) => {
            const companyDetail = [];
            for (const companyObj of payload.costCenterCompanyDivisionDetail) {
                const division = await lookup.searchDivision(companyObj.companyName, companyObj.divisionName);
                if (division) {
                    companyDetail.push({
                        companyId: division.companyId,
                        divisionId: division.id
                    });
                }
            }
            return {
                ...payload,
                costCenterCompanyDivisionDetail: companyDetail
            };
        });
    });

    test('should seed Role Master initial data', async ({ roleApi, workflow, lookup }) => {
        await workflow.seedInitialData(roleApi, roleData, "Role Master", async (payload) => {
            const formRights = [];
            if (payload.formRights) {
                for (const formRight of payload.formRights) {
                    const form = await lookup.getGlobalRecord("forms", formRight.formName);
                    if (form) {
                        const { formName, ...rest } = formRight;
                        formRights.push({ ...rest, formId: form.id });
                    }
                }
            }

            const reportRights: any = [];
            if (false) {
                for (const reportRight of payload.reportRights) {
                    if (reportRight.reportName) {
                        const report = await lookup.getGlobalRecord("report", reportRight.reportName);
                        if (report) {
                            reportRights.push({ reportId: report.id });
                        }
                    } else if (reportRight.reportId) {
                        reportRights.push({ reportId: reportRight.reportId });
                    }
                }
            }

            return {
                ...payload,
                formRights,
                reportRights
            };
        });
    });

    test('should seed User Master initial data', async ({ userApi, workflow, lookup }) => {
        await workflow.seedInitialData(userApi, userData, "User Master", async (payload) => {
            const contactInfo = await lookup.getContactNoAndCountryId(payload.countryName, userData.indexOf(payload));
            const contactNo = contactInfo.contactNo || payload.contactNo;
            const contactNoCountryId = contactInfo.contactNoCountryId || payload.contactNoCountryId;

            const userRoleDetail = [];
            if (payload.userRoleDetail && payload.userRoleDetail.length > 0) {
                for (const roleDetail of payload.userRoleDetail) {
                    const role = await lookup.getRecord("role", roleDetail.roleName);
                    const company = await lookup.getRecord("company", roleDetail.companyName);
                    userRoleDetail.push({
                        ...roleDetail,
                        roleId: role?.id,
                        companyId: company?.id
                    });
                }
            }

            const userDivisionDetail = [];
            if (payload.userDivisionDetail && payload.userDivisionDetail.length > 0) {
                for (const divDetail of payload.userDivisionDetail) {
                    const division = await lookup.getRecord("division", divDetail.divisionName);
                    userDivisionDetail.push({
                        ...divDetail,
                        divisionId: division?.id
                    });
                }
            }

            const userDepartmentDetail = [];
            if (payload.userDepartmentDetail && payload.userDepartmentDetail.length > 0) {
                for (const deptDetail of payload.userDepartmentDetail) {
                    const department = await lookup.getRecord("department", deptDetail.departmentName);
                    userDepartmentDetail.push({
                        ...deptDetail,
                        departmentId: department?.id
                    });
                }
            }

            return {
                ...payload,
                contactNo,
                contactNoCountryId,
                userRoleDetail,
                userDivisionDetail,
                userDepartmentDetail
            };
        });
    });

    test('should seed Supplier Account Master initial data', async ({ supplierAccountApi, workflow }) => {
        await workflow.seedInitialData(supplierAccountApi, supplierAccountData, "Supplier Account Master");
    });

    test('should seed Vendor Master Master initial data', async ({ vendorMasterApi, workflow, lookup }) => {
        test.setTimeout(90000);
        await workflow.seedInitialData(vendorMasterApi, vendorMasterData, "Vendor Master Master", async (payload) => {
            const vendorLocationDetail = [];
            if (payload.vendorLocationDetail && payload.vendorLocationDetail.length > 0) {
                let locIdx = 1;
                for (const loc of payload.vendorLocationDetail) {
                    const state = loc.stateName ? await lookup.getState(loc.stateName, loc.countryName) : null;
                    const city = loc.cityName ? await lookup.getRecord("city", loc.cityName) : null;

                    let vendorCategoryId = loc.vendorCategoryId;
                    if (!vendorCategoryId && loc.vendorCategoryName) {
                        const vendorCategory = await lookup.getRecord("vendorCategory", loc.vendorCategoryName);
                        vendorCategoryId = vendorCategory?.id;
                    }

                    const contactInfo = await lookup.getContactNoAndCountryId(loc.countryName || "India", locIdx++);
                    const contactNo = loc.contactNo || contactInfo.contactNo;
                    const contactNoCountryId = loc.contactNoCountryId || contactInfo.contactNoCountryId;

                    const vendorLocationContactPersonDetail = [];
                    if (loc.vendorLocationContactPersonDetail && loc.vendorLocationContactPersonDetail.length > 0) {
                        for (const cp of loc.vendorLocationContactPersonDetail) {
                            vendorLocationContactPersonDetail.push({
                                ...cp,
                                contactNo: cp.contactNo || contactNo,
                                contactNoCountryId: cp.contactNoCountryId || contactNoCountryId
                            });
                        }
                    }

                    const vendorLocationItemGroupDetail = [];
                    if (loc.vendorLocationItemGroupDetail && loc.vendorLocationItemGroupDetail.length > 0) {
                        for (const itemGroup of loc.vendorLocationItemGroupDetail) {
                            if (itemGroup.itemGroupName) {
                                const group = await lookup.getRecord("group", itemGroup.itemGroupName);
                                vendorLocationItemGroupDetail.push({
                                    ...itemGroup,
                                    itemGroupId: group?.id || itemGroup.itemGroupId
                                });
                            } else {
                                vendorLocationItemGroupDetail.push(itemGroup);
                            }
                        }
                    }

                    vendorLocationDetail.push({
                        ...loc,
                        countryId: state?.countryId || loc.countryId,
                        stateId: state?.id || loc.stateId,
                        cityId: city?.id || loc.cityId,
                        vendorCategoryId: vendorCategoryId || loc.vendorCategoryId,
                        contactNo,
                        contactNoCountryId,
                        vendorLocationContactPersonDetail,
                        vendorLocationItemGroupDetail
                    });
                }
            }

            return {
                ...payload,
                vendorLocationDetail
            };
        });
    });

    test('should seed Expense Head Master initial data', async ({ expenseHeadApi, workflow }) => {
        await workflow.seedInitialData(expenseHeadApi, expenseHeadData, "Expense Head Master");
    });

    test('should seed VendorAttachment Master initial data', async ({ vendorAttachmentApi, workflow }) => {
        await workflow.seedInitialData(vendorAttachmentApi, vendorAttachmentData, "VendorAttachment Master");
    });

    test('should seed Document Series initial data', async ({ documentSeriesApi, workflow, lookup }) => {
        await workflow.seedInitialData(documentSeriesApi, documentSeriesData, "Document Series", async (payload) => {
            const documentSeriesFormDetail = [];
            if (payload.documentSeriesFormDetail) {
                for (const formDetail of payload.documentSeriesFormDetail) {
                    const form = await lookup.getGlobalRecord("forms", formDetail.formName);
                    const { formName, ...restForm } = formDetail;
                    documentSeriesFormDetail.push({
                        ...restForm,
                        formId: form?.id
                    });
                }
            }

            const documentSeriesCompanyDetail = [];
            if (payload.documentSeriesCompanyDetail) {
                for (const companyDetail of payload.documentSeriesCompanyDetail) {
                    const company = await lookup.getRecord("company", companyDetail.companyName);
                    const { companyName, ...restCompany } = companyDetail;
                    documentSeriesCompanyDetail.push({
                        ...restCompany,
                        companyId: company?.id
                    });
                }
            }

            const documentSeriesDivisionDetail = [];
            if (payload.documentSeriesDivisionDetail) {
                for (const divisionDetail of payload.documentSeriesDivisionDetail) {
                    const division = await lookup.getRecord("division", divisionDetail.divisionName);
                    const { divisionName, ...restDivision } = divisionDetail;
                    documentSeriesDivisionDetail.push({
                        ...restDivision,
                        divisionId: division?.id
                    });
                }
            }

            const documentSeriesDocTypeDetail = [];
            if (payload.documentSeriesDocTypeDetail) {
                const formId = documentSeriesFormDetail[0]?.formId;
                for (const docTypeDetail of payload.documentSeriesDocTypeDetail) {
                    const docType = await lookup.getDocTypeByFormId(docTypeDetail.docTypeName, formId);
                    const { docTypeName, ...restDocType } = docTypeDetail;
                    documentSeriesDocTypeDetail.push({
                        ...restDocType,
                        docTypeId: docType?.id
                    });
                }
            }

            return {
                ...payload,
                documentSeriesFormDetail,
                documentSeriesCompanyDetail,
                documentSeriesDivisionDetail,
                documentSeriesDocTypeDetail
            };
        });
    });

    test('should seed Payment Terms Group Master initial data', async ({ paymentTermsGroupApi, workflow, lookup }) => {
        await workflow.seedInitialData(paymentTermsGroupApi, paymentTermsGroupData, "Payment Terms Group Master", async (payload) => {
            const paymentTermDetails = [];
            if (payload.paymentTermDetails) {
                for (const detail of payload.paymentTermDetails) {
                    const paymentType = await lookup.getGlobalRecord("paymentType", detail.paymentTypeName);
                    const baseDateType = await lookup.getGlobalRecord("baseDateType", detail.baseDateTypeName);
                    const payOn = await lookup.getGlobalRecord("payOn", detail.payOnName);

                    const { paymentTypeName, baseDateTypeName, payOnName, ...restDetail } = detail;
                    paymentTermDetails.push({
                        ...restDetail,
                        paymentTypeId: paymentType?.id,
                        baseDateTypeId: baseDateType?.id,
                        payOnId: payOn?.id
                    });
                }
            }
            return {
                ...payload,
                paymentTermDetails
            };
        });
    });

    test('should seed Request for Quotation initial data', async ({ requestForQuotationApi, workflow, lookup }) => {
        test.setTimeout(90000);
        await workflow.seedInitialData(requestForQuotationApi, requestForQuotationData, "Request for Quotation", async (payload) => {
            const company = await lookup.getRecord("company", payload.companyName);
            const docSeries = await lookup.searchRecord("docSeries", "Pattern.Contains", payload.docSeriesPattern);
            const docType = await lookup.searchRecord("docType", "DocTypeName.Contains", payload.docTypeName);
            const country = await lookup.getRecord("country", payload.contactNoCountryName || "India");
            const tncGroup = await lookup.getRecord("termsAndConditionGroup", payload.tncGroupName);

            const rfqItemDetail = [];
            if (payload.rfqItemDetail && payload.rfqItemDetail.length > 0) {
                for (const itemDetail of payload.rfqItemDetail) {
                    const item = await lookup.getRecord("item", itemDetail.itemName);
                    const make = itemDetail.makeName ? await lookup.getRecord("make", itemDetail.makeName) : null;
                    const unit = itemDetail.unitName ? await lookup.getRecord("unit", itemDetail.unitName) : null;

                    const { itemName, makeName, unitName, ...restItem } = itemDetail;
                    rfqItemDetail.push({
                        ...restItem,
                        itemId: item?.id,
                        makeId: make?.id,
                        unitId: unit?.id
                    });
                }
            }

            const rfqVendorDetail = [];
            if (payload.rfqVendorDetail && payload.rfqVendorDetail.length > 0) {
                for (const vendorDetail of payload.rfqVendorDetail) {
                    const vendorInfo = await lookup.getVendorLocationAndContactPerson(
                        vendorDetail.vendorName,
                        vendorDetail.vendorLocationName
                    );

                    const contactPersonDetail = [];
                    if (vendorDetail.contactPersonDetail && vendorDetail.contactPersonDetail.length > 0) {
                        for (const cpDetail of vendorDetail.contactPersonDetail) {
                            let cpId = null;
                            if (cpDetail.contactPersonName && vendorInfo.vendorLocation?.vendorLocationContactPersonDetail) {
                                const matchedCp = vendorInfo.vendorLocation.vendorLocationContactPersonDetail.find(
                                    (c: any) => c.contactPersonName?.toLowerCase().trim() === cpDetail.contactPersonName.toLowerCase().trim()
                                );
                                cpId = matchedCp?.id || vendorInfo.vendorLocationContactPersonId;
                            } else {
                                cpId = vendorInfo.vendorLocationContactPersonId;
                            }

                            const { contactPersonName, ...restCp } = cpDetail;
                            contactPersonDetail.push({
                                ...restCp,
                                vendorLocationContactPersonId: cpId
                            });
                        }
                    }

                    const { vendorName, vendorLocationName, ...restVendor } = vendorDetail;
                    rfqVendorDetail.push({
                        ...restVendor,
                        vendorLocationId: vendorInfo.vendorLocationId,
                        contactPersonDetail
                    });
                }
            }

            const rfqTncDetail = [];
            if (tncGroup?.id) {

                const tncHeads = await lookup.getTncGroupDetails(tncGroup.id);
                console.log("tncHead", tncHeads)
                for (const item of tncHeads) {
                    console.log("items", item)
                    rfqTncDetail.push({
                        tncHeadId: item.tncHead?.id || item.tncHeadId,
                        tncValue: item.tncValue || ""
                    });
                }
            }

            console.log('rfqTncDetail', rfqTncDetail);

            const { companyName, divisionName, departmentName, docSeriesPattern, docTypeName, contactNoCountryName, tncGroupName, ...restPayload } = payload;

            return {
                ...restPayload,
                companyId: company?.id,
                docSeriesId: docSeries?.id,
                docTypeId: docType?.id,
                contactNoCountryId: country?.id,
                tncGroupId: tncGroup?.id,
                rfqItemDetail,
                rfqVendorDetail,
                rfqTncDetail
            };
        });
    });
});
