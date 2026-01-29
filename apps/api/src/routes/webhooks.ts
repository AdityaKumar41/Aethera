import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import crypto from 'crypto';
import { prisma, UserRole } from '@aethera/database';
import { WalletService } from '@aethera/stellar';

const router = Router();
const walletService = new WalletService();

/**
 * Verify Sumsub Webhook Signature
 */
function verifySumsubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return digest === signature;
}

/**
 * Clerk Webhook Handler
 */
router.post('/clerk', async (req: Request, res: Response) => {
  // ... existing Clerk logic ...
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const body = JSON.stringify(req.body);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('[Clerk Webhook] Verification failed:', err);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  const eventType = evt.type;
  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(' ') || 'User';

        const existingUser = await prisma.user.findUnique({ where: { id } });

        if (!existingUser) {
          const wallet = await walletService.createWallet();
          await prisma.user.create({
            data: {
              id,
              email: email || '',
              name,
              role: 'INVESTOR' as UserRole,
              stellarPubKey: wallet.publicKey,
              stellarSecretEncrypted: wallet.encryptedSecret,
            },
          });
        }
        break;
      }
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(' ');

        await prisma.user.updateMany({
          where: { id },
          data: {
            email: email || undefined,
            name: name || undefined,
          },
        });
        break;
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`[Clerk Webhook] Error:`, error);
    return res.status(500).json({ error: 'Error processing webhook' });
  }
});

/**
 * Sumsub Webhook Handler
 */
router.post('/sumsub', async (req: Request, res: Response) => {
  const SUMSUB_WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET;
  const signature = req.headers['x-payload-digest'] as string;

  if (!SUMSUB_WEBHOOK_SECRET || !signature) {
    console.error('[Sumsub Webhook] Missing secret or signature');
    return res.status(400).json({ error: 'Missing secret or signature' });
  }

  const body = JSON.stringify(req.body);
  const isValid = verifySumsubSignature(body, signature, SUMSUB_WEBHOOK_SECRET);

  if (!isValid) {
    console.error('[Sumsub Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, applicantId, externalUserId, reviewResult, reviewStatus } = req.body;
  console.log(`[Sumsub Webhook] Received event: ${type} for user: ${externalUserId}`);

  try {
    if (type === 'applicantReviewed') {
      const isApproved = reviewResult?.reviewAnswer === 'GREEN';
      const kycStatus = isApproved ? 'VERIFIED' : 'REJECTED';

      await prisma.user.update({
        where: { id: externalUserId },
        data: {
          kycStatus,
        },
      });

      console.log(`[Sumsub Webhook] Updated KYC status for ${externalUserId} to ${kycStatus}`);
    }

    // Handle other events if needed (e.g., applicantCreated, applicantPending)
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Sumsub Webhook] Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
