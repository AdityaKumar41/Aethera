import * as dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

import { getRelayerService } from '../src/relayer';

async function verify() {
    console.log("Checking Relayer Configuration...");
    
    if (!process.env.ADMIN_RELAYER_PUBLIC_KEY) {
        console.error("❌ ADMIN_RELAYER_PUBLIC_KEY is missing in env");
    } else {
        console.log(`✅ Public Key found: ${process.env.ADMIN_RELAYER_PUBLIC_KEY}`);
    }

    if (!process.env.ADMIN_RELAYER_SECRET_ENCRYPTED) {
         console.warn("⚠️ ADMIN_RELAYER_SECRET_ENCRYPTED is missing. Relayer cannot sign.");
    }

    try {
        const relayer = getRelayerService();
        await relayer.initialize();
        const isReady = await relayer.isReady();
        const info = await relayer.getWalletInfo();
        
        console.log("--- Relayer Status ---");
        console.log(`Ready: ${isReady}`);
        console.log(`Balances: XLM=${info?.xlmBalance}, USDC=${info?.usdcBalance}`);
        
        if (isReady) console.log("✅ Relayer service is fully operational.");
        else console.log("❌ Relayer service is NOT ready.");
    } catch (e) {
        console.error("Error checking relayer:", e);
    }
}

verify();
