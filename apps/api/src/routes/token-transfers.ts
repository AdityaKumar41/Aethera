// ============================================
// Token Transfer Routes (Secondary Market)
// ============================================

import { Router } from "express";
import { z } from "zod";
import { tokenTransferService } from "../services/tokenTransferService.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

// Require authentication for all routes
router.use(authenticate);

// ============================================
// Create Token Listing (Sell Tokens)
// ============================================

const createListingSchema = z.object({
  projectId: z.string(),
  tokenAmount: z.number().int().positive(),
  pricePerToken: z.number().positive(),
});

router.post(
  "/listings",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = createListingSchema.parse(req.body);

      const listing = await tokenTransferService.createListing({
        sellerId: req.auth?.userId!,
        projectId: data.projectId,
        tokenAmount: data.tokenAmount,
        pricePerToken: data.pricePerToken,
      });

      res.status(201).json({
        success: true,
        message: "Token listing created successfully",
        data: listing,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Project Listings (Available Tokens)
// ============================================

router.get(
  "/projects/:projectId/listings",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const listings = await tokenTransferService.getProjectListings(
        req.params.projectId,
      );

      res.json({
        success: true,
        data: listings,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get My Listings
// ============================================

router.get(
  "/my-listings",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const listings = await tokenTransferService.getUserListings(
        req.auth?.userId!,
      );

      res.json({
        success: true,
        data: listings,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Accept Transfer (Buy Tokens)
// ============================================

router.post(
  "/listings/:id/accept",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const transfer = await tokenTransferService.acceptTransfer({
        transferId: req.params.id,
        buyerId: req.auth?.userId!,
      });

      res.json({
        success: true,
        message: "Token purchase completed successfully",
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Cancel Listing
// ============================================

router.delete(
  "/listings/:id",
  requireRole("INVESTOR"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await tokenTransferService.cancelListing(
        req.params.id,
        req.auth?.userId!,
      );

      res.json({
        success: true,
        message: "Listing cancelled successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
