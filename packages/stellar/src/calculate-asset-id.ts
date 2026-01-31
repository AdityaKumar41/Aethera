import { Asset, xdr, hash, StrKey } from "@stellar/stellar-sdk";

function getContractId(asset: Asset): string {
  const assetXdr = asset.toXDRObject();
  const contractIdPreimage = xdr.ContractIdPreimage.contractIdPreimageFromAsset(assetXdr);
  const networkId = hash(Buffer.from("Test SDF Network ; September 2015"));
  
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
        networkId: networkId,
        contractIdPreimage: contractIdPreimage
    })
  );
  
  const h = hash(preimage.toXDR());
  return StrKey.encodeContract(h);
}

const circleUsdc = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
const relayerUsdc = new Asset("USDC", "GCIUIGIBYI4TKUU75AZQ3X6PT6PJKWSTNBFKUKLYVHOAHQIHAE52SFT2");

console.log("Circle USDC Address:", getContractId(circleUsdc));
console.log("Relayer USDC Address:", getContractId(relayerUsdc));
