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
var stellar_sdk_1 = require("@stellar/stellar-sdk");
var TARGET_ADDRESS = "GBI72UH3FX5CXCFSP5LQKJSGOTS2B2EU7JIPE7BMYQSWYMN33SZR2JCF";
var AMOUNT = "10000";
function fundUSDC() {
    return __awaiter(this, void 0, void 0, function () {
        var server, issuerKeypair, distributorKeypair, usdcAsset, distributorAccount, trustlineTx, issuerAccount, issueTx, targetAccount, hasTrustline, error_1, sendTx, result, error_2;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    console.log("\uD83D\uDE80 Funding ".concat(TARGET_ADDRESS, " with ").concat(AMOUNT, " USDC..."));
                    server = new stellar_sdk_1.Horizon.Server("https://horizon-testnet.stellar.org");
                    issuerKeypair = stellar_sdk_1.Keypair.random();
                    distributorKeypair = stellar_sdk_1.Keypair.random();
                    console.log("\uD83D\uDCDD Issuer: ".concat(issuerKeypair.publicKey()));
                    console.log("\uD83D\uDCDD Distributor: ".concat(distributorKeypair.publicKey()));
                    // Fund both with friendbot
                    console.log("\n💰 Funding issuer with XLM...");
                    return [4 /*yield*/, server.friendbot(issuerKeypair.publicKey()).call()];
                case 1:
                    _k.sent();
                    console.log("💰 Funding distributor with XLM...");
                    return [4 /*yield*/, server.friendbot(distributorKeypair.publicKey()).call()];
                case 2:
                    _k.sent();
                    // Wait for accounts to be ready
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 3:
                    // Wait for accounts to be ready
                    _k.sent();
                    usdcAsset = new stellar_sdk_1.Asset("USDC", issuerKeypair.publicKey());
                    // 1. Distributor creates trustline to issuer
                    console.log("\n🔗 Creating trustline from distributor to issuer...");
                    return [4 /*yield*/, server.loadAccount(distributorKeypair.publicKey())];
                case 4:
                    distributorAccount = _k.sent();
                    trustlineTx = new stellar_sdk_1.TransactionBuilder(distributorAccount, {
                        fee: "10000",
                        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                    })
                        .addOperation(stellar_sdk_1.Operation.changeTrust({
                        asset: usdcAsset,
                        limit: "1000000000",
                    }))
                        .setTimeout(30)
                        .build();
                    trustlineTx.sign(distributorKeypair);
                    return [4 /*yield*/, server.submitTransaction(trustlineTx)];
                case 5:
                    _k.sent();
                    console.log("✅ Trustline created");
                    // 2. Issue USDC to distributor
                    console.log("\n💵 Issuing USDC to distributor...");
                    return [4 /*yield*/, server.loadAccount(issuerKeypair.publicKey())];
                case 6:
                    issuerAccount = _k.sent();
                    issueTx = new stellar_sdk_1.TransactionBuilder(issuerAccount, {
                        fee: "10000",
                        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                    })
                        .addOperation(stellar_sdk_1.Operation.payment({
                        destination: distributorKeypair.publicKey(),
                        asset: usdcAsset,
                        amount: "1000000",
                    }))
                        .setTimeout(30)
                        .build();
                    issueTx.sign(issuerKeypair);
                    return [4 /*yield*/, server.submitTransaction(issueTx)];
                case 7:
                    _k.sent();
                    console.log("✅ USDC issued");
                    // 3. Check if target has trustline, create if needed
                    console.log("\n🔍 Checking target account...");
                    _k.label = 8;
                case 8:
                    _k.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, server.loadAccount(TARGET_ADDRESS)];
                case 9:
                    targetAccount = _k.sent();
                    hasTrustline = targetAccount.balances.some(function (balance) {
                        return balance.asset_type !== "native" &&
                            balance.asset_code === "USDC" &&
                            balance.asset_issuer === issuerKeypair.publicKey();
                    });
                    console.log("Trustline exists: ".concat(hasTrustline));
                    if (!hasTrustline) {
                        console.log("⚠️  Target needs trustline - this will be created by their wallet");
                        console.log("Note: User must create trustline first or we need their secret key");
                    }
                    return [3 /*break*/, 11];
                case 10:
                    error_1 = _k.sent();
                    if (((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                        console.log("⚠️  Account doesn't exist - needs to be funded with XLM first");
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 11];
                case 11:
                    // 4. Send USDC to target (will fail if no trustline)
                    console.log("\n\uD83D\uDCB8 Sending ".concat(AMOUNT, " USDC to target..."));
                    return [4 /*yield*/, server.loadAccount(distributorKeypair.publicKey())];
                case 12:
                    distributorAccount = _k.sent();
                    sendTx = new stellar_sdk_1.TransactionBuilder(distributorAccount, {
                        fee: "10000",
                        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                    })
                        .addOperation(stellar_sdk_1.Operation.payment({
                        destination: TARGET_ADDRESS,
                        asset: usdcAsset,
                        amount: AMOUNT,
                    }))
                        .setTimeout(30)
                        .build();
                    sendTx.sign(distributorKeypair);
                    _k.label = 13;
                case 13:
                    _k.trys.push([13, 15, , 16]);
                    return [4 /*yield*/, server.submitTransaction(sendTx)];
                case 14:
                    result = _k.sent();
                    console.log("✅ SUCCESS! USDC sent");
                    console.log("Transaction: https://stellar.expert/explorer/testnet/tx/".concat(result.hash));
                    console.log("\n\uD83D\uDCCA Issuer: ".concat(issuerKeypair.publicKey()));
                    console.log("\uD83D\uDCB0 Amount: ".concat(AMOUNT, " USDC"));
                    return [3 /*break*/, 16];
                case 15:
                    error_2 = _k.sent();
                    console.error("❌ Failed to send USDC:", (_d = (_c = (_b = error_2.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.extras) === null || _d === void 0 ? void 0 : _d.result_codes);
                    if ((_j = (_h = (_g = (_f = (_e = error_2.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.extras) === null || _g === void 0 ? void 0 : _g.result_codes) === null || _h === void 0 ? void 0 : _h.operations) === null || _j === void 0 ? void 0 : _j.includes("op_no_trust")) {
                        console.log("\n⚠️  Target account needs to create a trustline first!");
                        console.log("Run this to create trustline manually (need their secret key)");
                    }
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
fundUSDC().catch(console.error);
