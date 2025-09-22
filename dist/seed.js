"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var XLSX = require("xlsx");
var path_1 = require("path");
var prisma = new client_1.PrismaClient();
// Helper function to parse UK date format (dd/mm/yy) to ISO date
function parseUKDate(dateStr) {
    var _a = dateStr.split('/'), day = _a[0], month = _a[1], year = _a[2];
    // Convert 2-digit year to 4-digit year (assuming 20xx)
    var fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
}
// Helper function to get the start of the week (Monday)
function getWeekStart(date) {
    var day = date.getDay();
    var diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
}
// Helper function to normalize work type names
function normalizeWorkType(typeOfWork) {
    var normalized = typeOfWork.trim().toLowerCase();
    // Map common variations to standard names
    var workTypeMap = {
        'project': 'Project',
        'projects': 'Project',
        'presales': 'PreSales',
        'pre-sales': 'PreSales',
        'pre sales': 'PreSales',
        'internal': 'Internal',
        'holiday': 'Holiday',
        'holidays': 'Holiday',
        'vacation': 'Holiday',
        'sick': 'Holiday',
        'training': 'Internal',
        'admin': 'Internal',
        'meetings': 'Internal'
    };
    return workTypeMap[normalized] || typeOfWork.trim();
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var excelPath, workbook, sheetName, worksheet, data, headers_1, rows, resourceColIndex, typeOfWorkColIndex, descriptionColIndex, customerColIndex, dateColumns_2, processedRows, createdResources, createdProjects, createdWorkTypes, createdAllocations, _i, rows_1, row, resourceName, typeOfWork, description, customer, resource, normalizedWorkType, workType, projectId, projectName, project, _a, dateColumns_1, dateCol, value, daysAllocated, error_1, error_2;
        var _b, _c, _d, _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    console.log('🌱 Starting database seed...');
                    _k.label = 1;
                case 1:
                    _k.trys.push([1, 15, 16, 18]);
                    excelPath = path_1.default.join(process.cwd(), 'PrezienResourcing.xlsx');
                    console.log("\uD83D\uDCD6 Reading Excel file from: ".concat(excelPath));
                    workbook = XLSX.readFile(excelPath);
                    sheetName = '2025';
                    if (!workbook.SheetNames.includes(sheetName)) {
                        throw new Error("Sheet '".concat(sheetName, "' not found. Available sheets: ").concat(workbook.SheetNames.join(', ')));
                    }
                    worksheet = workbook.Sheets[sheetName];
                    data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    console.log("\uD83D\uDCCA Found ".concat(data.length, " rows in sheet '").concat(sheetName, "'"));
                    if (data.length < 2) {
                        throw new Error('Excel file must have at least a header row and one data row');
                    }
                    headers_1 = data[0];
                    rows = data.slice(1);
                    console.log('📋 Headers:', headers_1);
                    resourceColIndex = headers_1.findIndex(function (h) { return h === null || h === void 0 ? void 0 : h.toString().toLowerCase().includes('resource'); });
                    typeOfWorkColIndex = headers_1.findIndex(function (h) { return (h === null || h === void 0 ? void 0 : h.toString().toLowerCase().includes('type')) && (h === null || h === void 0 ? void 0 : h.toString().toLowerCase().includes('work')); });
                    descriptionColIndex = headers_1.findIndex(function (h) { return h === null || h === void 0 ? void 0 : h.toString().toLowerCase().includes('description'); });
                    customerColIndex = headers_1.findIndex(function (h) { return h === null || h === void 0 ? void 0 : h.toString().toLowerCase().includes('customer'); });
                    if (resourceColIndex === -1)
                        throw new Error('Resource column not found');
                    if (typeOfWorkColIndex === -1)
                        throw new Error('Type of Work column not found');
                    if (descriptionColIndex === -1)
                        throw new Error('Description column not found');
                    if (customerColIndex === -1)
                        throw new Error('Customer column not found');
                    console.log("\uD83D\uDCCD Column indices - Resource: ".concat(resourceColIndex, ", Type: ").concat(typeOfWorkColIndex, ", Description: ").concat(descriptionColIndex, ", Customer: ").concat(customerColIndex));
                    dateColumns_2 = [];
                    headers_1.forEach(function (header, index) {
                        if (header && typeof header === 'string') {
                            // Check if header looks like a date (dd/mm/yy format)
                            var dateMatch = header.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
                            if (dateMatch) {
                                try {
                                    var date = parseUKDate(header);
                                    var weekStart = getWeekStart(new Date(date));
                                    dateColumns_2.push({ index: index, date: date, weekStart: weekStart });
                                }
                                catch (error) {
                                    console.warn("\u26A0\uFE0F Could not parse date from header: ".concat(header));
                                }
                            }
                        }
                    });
                    console.log("\uD83D\uDCC5 Found ".concat(dateColumns_2.length, " date columns:"), dateColumns_2.map(function (dc) { return "".concat(headers_1[dc.index], " -> ").concat(dc.weekStart.toISOString().split('T')[0]); }));
                    processedRows = 0;
                    createdResources = 0;
                    createdProjects = 0;
                    createdWorkTypes = 0;
                    createdAllocations = 0;
                    _i = 0, rows_1 = rows;
                    _k.label = 2;
                case 2:
                    if (!(_i < rows_1.length)) return [3 /*break*/, 14];
                    row = rows_1[_i];
                    if (!row || row.length === 0)
                        return [3 /*break*/, 13];
                    resourceName = (_c = (_b = row[resourceColIndex]) === null || _b === void 0 ? void 0 : _b.toString()) === null || _c === void 0 ? void 0 : _c.trim();
                    typeOfWork = (_e = (_d = row[typeOfWorkColIndex]) === null || _d === void 0 ? void 0 : _d.toString()) === null || _e === void 0 ? void 0 : _e.trim();
                    description = (_g = (_f = row[descriptionColIndex]) === null || _f === void 0 ? void 0 : _f.toString()) === null || _g === void 0 ? void 0 : _g.trim();
                    customer = (_j = (_h = row[customerColIndex]) === null || _h === void 0 ? void 0 : _h.toString()) === null || _j === void 0 ? void 0 : _j.trim();
                    if (!resourceName || !typeOfWork) {
                        console.warn("\u26A0\uFE0F Skipping row with missing resource or work type:", row);
                        return [3 /*break*/, 13];
                    }
                    return [4 /*yield*/, prisma.resource.upsert({
                            where: { name: resourceName },
                            update: {},
                            create: {
                                name: resourceName,
                                role: 'Developer', // Default role, can be updated later
                                isActive: true
                            }
                        })];
                case 3:
                    resource = _k.sent();
                    if (resource.createdAt.getTime() === resource.updatedAt.getTime()) {
                        createdResources++;
                    }
                    normalizedWorkType = normalizeWorkType(typeOfWork);
                    return [4 /*yield*/, prisma.workType.upsert({
                            where: { name: normalizedWorkType },
                            update: {},
                            create: {
                                name: normalizedWorkType,
                                description: "Work type: ".concat(normalizedWorkType),
                                isActive: true
                            }
                        })];
                case 4:
                    workType = _k.sent();
                    if (workType.createdAt.getTime() === workType.updatedAt.getTime()) {
                        createdWorkTypes++;
                    }
                    projectId = null;
                    if (!(normalizedWorkType !== 'Holiday' && normalizedWorkType !== 'Internal' && description)) return [3 /*break*/, 6];
                    projectName = description;
                    return [4 /*yield*/, prisma.project.upsert({
                            where: { name: projectName },
                            update: {
                                customer: customer || null
                            },
                            create: {
                                name: projectName,
                                customer: customer || null,
                                description: description,
                                isActive: true
                            }
                        })];
                case 5:
                    project = _k.sent();
                    if (project.createdAt.getTime() === project.updatedAt.getTime()) {
                        createdProjects++;
                    }
                    projectId = project.id;
                    _k.label = 6;
                case 6:
                    _a = 0, dateColumns_1 = dateColumns_2;
                    _k.label = 7;
                case 7:
                    if (!(_a < dateColumns_1.length)) return [3 /*break*/, 12];
                    dateCol = dateColumns_1[_a];
                    value = row[dateCol.index];
                    // Skip if value is null, undefined, empty string, or zero
                    if (value === null || value === undefined || value === '' || value === 0) {
                        return [3 /*break*/, 11];
                    }
                    daysAllocated = parseFloat(value.toString());
                    if (isNaN(daysAllocated) || daysAllocated <= 0) {
                        return [3 /*break*/, 11];
                    }
                    _k.label = 8;
                case 8:
                    _k.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, prisma.allocation.upsert({
                            where: {
                                resourceId_projectId_workTypeId_weekStart: {
                                    resourceId: resource.id,
                                    projectId: projectId !== null && projectId !== void 0 ? projectId : '',
                                    workTypeId: workType.id,
                                    weekStart: dateCol.weekStart
                                }
                            },
                            update: {
                                days: daysAllocated
                            },
                            create: {
                                resourceId: resource.id,
                                projectId: projectId,
                                workTypeId: workType.id,
                                weekStart: dateCol.weekStart,
                                days: daysAllocated
                            }
                        })];
                case 9:
                    _k.sent();
                    createdAllocations++;
                    return [3 /*break*/, 11];
                case 10:
                    error_1 = _k.sent();
                    console.error("\u274C Error creating allocation for ".concat(resourceName, " on ").concat(dateCol.weekStart.toISOString().split('T')[0], ":"), error_1);
                    return [3 /*break*/, 11];
                case 11:
                    _a++;
                    return [3 /*break*/, 7];
                case 12:
                    processedRows++;
                    if (processedRows % 10 === 0) {
                        console.log("\uD83D\uDCC8 Processed ".concat(processedRows, " rows..."));
                    }
                    _k.label = 13;
                case 13:
                    _i++;
                    return [3 /*break*/, 2];
                case 14:
                    console.log('\n✅ Seed completed successfully!');
                    console.log("\uD83D\uDCCA Summary:");
                    console.log("   - Processed rows: ".concat(processedRows));
                    console.log("   - New resources created: ".concat(createdResources));
                    console.log("   - New work types created: ".concat(createdWorkTypes));
                    console.log("   - New projects created: ".concat(createdProjects));
                    console.log("   - Allocations created/updated: ".concat(createdAllocations));
                    return [3 /*break*/, 18];
                case 15:
                    error_2 = _k.sent();
                    console.error('❌ Seed failed:', error_2);
                    throw error_2;
                case 16: return [4 /*yield*/, prisma.$disconnect()];
                case 17:
                    _k.sent();
                    return [7 /*endfinally*/];
                case 18: return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
});
