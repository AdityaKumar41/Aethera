import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';

/**
 * Clerk Webhook Handler
 * Handles user lifecycle events from Clerk
 * 
 * Configure in Clerk Dashboard:
 * - Endpoint URL: https://your-domain.com/api/webhooks/clerk
 * - Events: user.created, user.updated, user.deleted
 */
export async function POST(req: Request) {
  // Get the webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  // Handle the webhook events
  const eventType = evt.type;

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(' ') || 'User';

        console.log(`[Clerk Webhook] User created: ${id} (${email})`);

        // Note: We don't create the full user record here
        // User will complete onboarding to set their role
        // The sync endpoint will create the full record
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(' ');

        console.log(`[Clerk Webhook] User updated: ${id} (${email})`);

        // Optionally sync updates to our database
        // We could call our API here to update email/name
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;

        console.log(`[Clerk Webhook] User deleted: ${id}`);

        // Handle user deletion
        // Soft delete or mark as inactive in our database
        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    console.error(`[Clerk Webhook] Error handling ${eventType}:`, error);
    return new Response('Error processing webhook', { status: 500 });
  }
}
