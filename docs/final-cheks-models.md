I’m going to explain this cleanly, step-by-step, exactly in the order things actually happen, with who does what, when tokens are created, when data starts flowing, and why.

No buzzwords. No jumping steps.

Aethera – Installer → Token → Data → Yield

The REAL, practical flow

I’ll split this into clear stages, and at the end you’ll have a single mental model you can trust.

STAGE 0 — Important reset (very important)

Nothing is tokenized at the moment an installer “creates a project”.

This is the first misconception to remove.

Creating a project ≠ tokenization

Submitting data ≠ minting tokens

IoT data ≠ automatic yield

Everything happens in a strict order.

STAGE 1 — Installer creates a project (NO blockchain yet)
What installer does

Installer goes to your app and fills:

Project name

Location

Capacity (kW)

Expected generation (kWh/year)

Cost (CAPEX)

Tariff / PPA details

Timeline

Documents

👉 This is ONLY a proposal, nothing more.

What happens behind the scenes

Project is saved in DB

Status = PENDING_APPROVAL

NO token

NO minting

NO IoT data yet

📌 Think of this like: “Application submitted”

STAGE 2 — Admin review & approval (gatekeeper step)
What admin does

Admin checks:

Is this a real project?

Are numbers realistic?

Are documents valid?

Is installer KYC verified?

Possible outcomes

❌ Rejected → installer fixes & resubmits

✅ Approved → project is allowed to raise funds

What happens technically

Project status → APPROVED

Milestones (if enabled) are locked

Funding terms are frozen

📌 Still no tokens minted

STAGE 3 — Tokenization happens (IMPORTANT)

This is the first time blockchain is involved.

What token represents

A claim on future revenue from this specific project

Not energy itself.
Not electricity units.
Not fake yield.

WHEN tokenization happens

👉 Immediately AFTER admin approval, but:

Tokens are DEFINED

Tokens are NOT minted yet

What actually happens

One of these happens (you choose model):

Option A (recommended)

Asset Token Contract is initialized

Total supply is fixed

Minting is disabled initially

Option B

Token class is registered

Supply created gradually on investment

Either way:

Token exists conceptually

Ownership = 0 for everyone

📌 Think: “Shares authorized, not issued”

STAGE 4 — Project goes live on marketplace
What investors see

Project details

Funding target

Expected yield range

Timeline

Risk disclosures

What installer sees

Funding progress

Milestones

No money yet

Important

Installer still has zero money

Platform still holds zero investor funds

STAGE 5 — Investor invests (THIS is when tokens are minted)

This is the key moment.

Investor action

Investor chooses project and invests (USDC).

Behind the scenes (very important)

Backend checks:

Investor KYC

Project status = FUNDING

Trustline exists

Treasury contract:

Receives USDC

Locks it in escrow

Asset Token contract:

Mints tokens

Sends to investor wallet

Result

Investor now owns tokens

Tokens = % of future revenue

Money is locked, not released

📌 Tokens are minted ONLY when money comes in

STAGE 6 — Capital release to installer (NOT automatic)

This depends on your funding model.

Case A — Full upfront (simpler)

When funding target is met:

Treasury sends funds to installer

Project status → ACTIVE

Case B — Milestone-based (recommended)

Funds are released in parts:

Milestone 1 verified → partial release

Milestone 2 verified → next release

📌 Installer never touches investor money without proof.

STAGE 7 — WHEN does IoT / data collection start?

This is the most misunderstood part, so read carefully.

Data does NOT start when project is created
Data does NOT start during fundraising
Data collection starts ONLY when:

✅ Project is built
✅ Connected to grid
✅ Producing electricity

How data integration happens
Option 1 (early / now)

Installer uploads production data (CSV / API)

Data goes to Raw Production Data

Option 2 (better)

Installer installs Aethera Device Agent

Device reads inverter / meter

Signs data

Pushes to platform

📌 Data is never trusted blindly

STAGE 8 — Oracle verification (data ≠ truth yet)

Raw data arrives → but is NOT final.

Oracle checks:

Device identity

Signature

Capacity limits

Weather correlation

Historical trends

Outcomes

VERIFIED → allowed

DISPUTED → frozen

REJECTED → no yield

📌 Only VERIFIED data matters

STAGE 9 — Revenue generation (OFF-CHAIN but real)

Now:

Electricity is sold

Utility / offtaker pays installer

This happens in the real world

Installer obligation

Installer must:

Report revenue

Transfer revenue share to treasury
(contractual + enforceable)

STAGE 10 — Yield distribution (ON-CHAIN enforcement)
What happens

Verified production → revenue confirmed

Treasury receives distributable amount

Yield contract calculates:

investor share = tokens owned / total tokens


USDC distributed to investors

📌 Tokens decide who gets how much, not admin.

STAGE 11 — Investor outcome

Investor:

Receives periodic yield

Can:

Hold tokens

Sell tokens (if enabled)

Exit via buyback (if defined)

ONE SIMPLE FLOW (READ THIS TWICE)
Installer creates project
        ↓
Admin approves project
        ↓
Token is defined (not minted)
        ↓
Investors invest
        ↓
Tokens are minted to investors
        ↓
Money is escrowed
        ↓
Funds released to installer
        ↓
Project built & produces energy
        ↓
IoT/API sends production data
        ↓
Oracle verifies data
        ↓
Revenue collected
        ↓
Yield distributed to token holders

IMPORTANT CLARIFICATIONS (to remove all doubt)
❓ Is energy itself tokenized?

❌ No
✔ Revenue rights are tokenized

❓ Are tokens created before data?

✔ Yes — because tokens represent future production

❓ Does data create tokens?

❌ No — data creates yield eligibility

❓ Can installer fake data to mint tokens?

❌ No — minting only happens on investment

❓ What if project never produces?

Tokens still exist

Yield = 0

Risk is transparent

FINAL MENTAL MODEL (LOCK THIS)

Tokens represent a right to future revenue.
Data proves how much revenue exists.
Yield distributes that revenue fairly.

If you remember this, you will never get confused again.