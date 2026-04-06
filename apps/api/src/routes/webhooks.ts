import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import crypto from 'crypto';
import { prisma, UserRole } from '@aethera/database';
import { WalletService } from '@aethera/stellar';
import { getSumsubService } from '@aethera/kyc';

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

  const body = (req as any).rawBody || JSON.stringify(req.body);
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

        const existingUserById = await prisma.user.findUnique({ where: { id } });
        const existingUserByEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;

        if (!existingUserById) {
          if (existingUserByEmail) {
            // Link existing user with Clerk ID by deleting and recreating or merging
            // Note: Since 'id' is primary key, we can't update it. 
            // If they have no foreign key data yet (check-sync), we can migrate them.
            // For now, let's keep it simple: if they exist by email but have different ID,
            // we'll update their record if we can, but since we use Clerk ID as 'id',
            // we really should have used the Clerk ID from the start.
            
            console.log(`[Clerk Webhook] Found existing user with email ${email} but different ID. Migrating to Clerk ID ${id}`);
            
            try {
              // Create new user with Clerk ID and metadata from existing user
              const wallet = existingUserByEmail.stellarPubKey 
                ? { publicKey: existingUserByEmail.stellarPubKey, encryptedSecret: existingUserByEmail.stellarSecretEncrypted }
                : await walletService.createWallet();

              await prisma.$transaction([
                prisma.user.delete({ where: { email: email! } }),
                prisma.user.create({
                  data: {
                    id,
                    email: email!,
                    name: existingUserByEmail.name || name,
                    role: existingUserByEmail.role,
                    stellarPubKey: wallet.publicKey,
                    stellarSecretEncrypted: wallet.encryptedSecret,
                    phone: existingUserByEmail.phone,
                    company: existingUserByEmail.company,
                  }
                })
              ]);
              console.log(`[Clerk Webhook] Successfully migrated user ${email} to Clerk ID ${id}`);
            } catch (migrateError) {
              console.error(`[Clerk Webhook] Migration failed:`, migrateError);
              throw migrateError; // Rethrow to be caught by main catch block
            }
          } else {
            // Create new user
            const wallet = await walletService.createWallet();
            await prisma.user.create({
              data: {
                id,
                email: email || '',
                name,
                role: 'UNSET' as UserRole,
                stellarPubKey: wallet.publicKey,
                stellarSecretEncrypted: wallet.encryptedSecret,
              },
            });
            console.log(`[Clerk Webhook] Created new user: ${email} (${id})`);
          }
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
  } catch (error: any) {
    console.error(`[Clerk Webhook] Error:`, error);
    return res.status(500).json({ 
      error: 'Error processing webhook',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
  console.log(`[Sumsub Webhook] Received event: ${type}`);
  console.log(`[Sumsub Webhook] Body details: applicantId=${applicantId}, externalUserId=${externalUserId}, reviewStatus=${reviewStatus}`);
  if (reviewResult) {
    console.log(`[Sumsub Webhook] Review Result:`, JSON.stringify(reviewResult, null, 2));
  }

  try {
    const sumsubService = getSumsubService();

    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: externalUserId },
    });

    if (!existingUser) {
      console.log(`[Sumsub Webhook] User ${externalUserId} not found in database, skipping update`);
      // Return 200 to acknowledge webhook - Sumsub may retry otherwise
      return res.status(200).json({ success: true, message: 'User not found, webhook acknowledged' });
    }

    // Map webhook to internal KYC status using the service logic
    const kycStatus = sumsubService.mapWebhookToKycStatus(req.body);
    console.log(`[Sumsub Webhook] Mapped KYC status to: ${kycStatus}`);
    
    // Update data for database
    const updateData: any = {
      kycStatus,
    };

    if (kycStatus === 'VERIFIED') {
      updateData.kycVerifiedAt = new Date();
    } else if (kycStatus === 'IN_REVIEW' && !existingUser.kycSubmittedAt) {
      updateData.kycSubmittedAt = new Date();
    }

    // Store rich review details if available
    if (reviewResult) {
      const existingDocs = existingUser.kycDocuments as any;
      updateData.kycDocuments = {
        applicantId: applicantId || existingDocs?.applicantId,
        reviewAnswer: reviewResult.reviewAnswer,
        rejectLabels: reviewResult.rejectLabels,
        moderationComment: reviewResult.moderationComment,
        reviewedAt: new Date().toISOString(),
      };
    }

    await prisma.user.update({
      where: { id: externalUserId },
      data: updateData,
    });

    console.log(`[Sumsub Webhook] Updated KYC status for ${externalUserId} to ${kycStatus} (Event: ${type})`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Sumsub Webhook] Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
