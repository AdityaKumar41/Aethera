import * as StellarSdk from "@stellar/stellar-sdk";
import crypto from "crypto";

const adminPubKey = "GCCB36VEX2CCGBLACLH5PYUGEFFL6DIJZBLFEOUBGUSBFTXPECZNPWTA";
const salt = Buffer.alloc(32); // All zeros
salt[31] = 1;

const networkPassphrase = "Test SDF Network ; September 2015";

const networkId = StellarSdk.hash(Buffer.from(networkPassphrase));
const scAddress = StellarSdk.Address.fromString(adminPubKey).toScAddress();

const contractIdPreimageFromAddress = new StellarSdk.xdr.ContractIdPreimageFromAddress({
    address: scAddress,
    salt: salt // Try Buffer
});

const preimage = StellarSdk.xdr.HashIdPreimage.envelopeTypeContractId(
    new StellarSdk.xdr.HashIdPreimageContractId({
        networkId,
        contractIdPreimage: StellarSdk.xdr.ContractIdPreimage.contractIdPreimageFromAddress(
            contractIdPreimageFromAddress
        )
    })
);

const contractId = StellarSdk.StrKey.encodeContract(StellarSdk.hash(preimage.toXDR()));
console.log("Calculated ID:", contractId);
