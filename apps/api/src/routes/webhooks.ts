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
 * 
 * Sumsub sends signature in different headers depending on configuration:
 * - x-payload-digest (SHA256)
 * - x-signature (older format)
 * The signature is HMAC-SHA256 of the raw request body
 */
router.post('/sumsub', async (req: Request, res: Response) => {
  const SUMSUB_WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET;
  
  // Sumsub can send signature in different headers
  const signature = (
    req.headers['x-payload-digest'] || 
    req.headers['x-signature'] || 
    req.headers['x-sumsub-signature']
  ) as string;

  console.log('[Sumsub Webhook] Received request');
  console.log('[Sumsub Webhook] Headers:', JSON.stringify(req.headers, null, 2));

  if (!SUMSUB_WEBHOOK_SECRET) {
    console.error('[Sumsub Webhook] Missing SUMSUB_WEBHOOK_SECRET in environment');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!signature) {
    console.error('[Sumsub Webhook] No signature header found');
    console.log('[Sumsub Webhook] Available headers:', Object.keys(req.headers));
    return res.status(400).json({ error: 'Missing signature header' });
  }

  // Use raw body (captured before JSON parsing) for accurate signature verification
  // Falls back to JSON.stringify if rawBody not available
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  
  // Compute HMAC-SHA256 of the raw body
  const hmac = crypto.createHmac('sha256', SUMSUB_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const computedDigest = hmac.digest('hex');

  console.log('[Sumsub Webhook] Raw body length:', rawBody.length);
  console.log('[Sumsub Webhook] Received signature:', signature);
  console.log('[Sumsub Webhook] Computed digest:', computedDigest);

  // Compare signatures (case-insensitive, handle both with and without prefix)
  const receivedSig = signature.toLowerCase().replace('sha256=', '');
  const isValid = receivedSig === computedDigest.toLowerCase();

  if (!isValid) {
    console.error('[Sumsub Webhook] Signature mismatch');
    console.error('[Sumsub Webhook] Expected:', computedDigest);
    console.error('[Sumsub Webhook] Got:', receivedSig);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('[Sumsub Webhook] Signature verified successfully');

  const { type, applicantId, externalUserId, reviewResult, reviewStatus } = req.body;
  console.log(`[Sumsub Webhook] Received event: ${type} for user: ${externalUserId}`);

  try {
    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: externalUserId },
    });

    if (!existingUser) {
      console.log(`[Sumsub Webhook] User ${externalUserId} not found in database, skipping update`);
      // Return 200 to acknowledge webhook - Sumsub may retry otherwise
      return res.status(200).json({ success: true, message: 'User not found, webhook acknowledged' });
    }

    if (type === 'applicantReviewed') {
      const isApproved = reviewResult?.reviewAnswer === 'GREEN';
      const kycStatus = isApproved ? 'VERIFIED' : 'REJECTED';

      await prisma.user.update({
        where: { id: externalUserId },
        data: {
          kycStatus,
          kycVerifiedAt: isApproved ? new Date() : undefined,
        },
      });

      console.log(`[Sumsub Webhook] Updated KYC status for ${externalUserId} to ${kycStatus}`);
    } else if (type === 'applicantPending' || type === 'applicantCreated') {
      // Update to IN_REVIEW when applicant starts verification
      await prisma.user.update({
        where: { id: externalUserId },
        data: {
          kycStatus: 'IN_REVIEW',
          kycSubmittedAt: new Date(),
        },
      });
      console.log(`[Sumsub Webhook] Updated user ${externalUserId} to IN_REVIEW`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Sumsub Webhook] Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
