import { Keypair } from '@stellar/stellar-sdk';
import crypto from 'crypto';

export interface CustodialWallet {
  publicKey: string;
  encryptedSecret: string;
}

export class WalletService {
  private encryptionKey: string;

  constructor(encryptionKey: string = process.env.ENCRYPTION_KEY || 'default-aethera-dev-key') {
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(encryptionKey)
      .digest('base64')
      .slice(0, 32);
  }

  /**
   * Generates a new Stellar Keypair and returns encrypted secret
   */
  async createWallet(): Promise<CustodialWallet> {
    const keypair = Keypair.random();
    const secret = keypair.secret();
    
    return {
      publicKey: keypair.publicKey(),
      encryptedSecret: this.encrypt(secret),
    };
  }

  /**
   * Decrypts a secret key for use in signing
   */
  decryptSecret(encryptedSecret: string): string {
    const [ivHex, encryptedHex] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  }

  /**
   * Mock balance check for prototype
   */
  async getBalances(publicKey: string): Promise<any[]> {
    return [
      { asset_type: 'native', balance: '10.0000000' },
      { asset_code: 'USDC', asset_issuer: 'GBBD67V1..', balance: '100.00' }
    ];
  }

  /**
   * Mock funding check
   */
  async isAccountFunded(publicKey: string): Promise<boolean> {
    return true;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }
}

export const walletService = new WalletService();
