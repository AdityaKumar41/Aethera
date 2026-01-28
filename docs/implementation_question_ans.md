Perfect — these are **exactly the right “before we build” questions**.
I’ll give you **clear, opinionated recommendations** for each one, **with reasoning**, and I’ll also tell you what I’d do **if this were my product** building an MVP fast but correctly.

---

# Questions Before Proceeding — Clear Answers

## 1. Authentication Provider

**NextAuth.js vs Clerk**

### ✅ Recommendation: **Clerk (managed) for MVP**

### Why:

* Built-in:

  * Email / OAuth
  * Session management
  * Webhooks
  * Role support
* Much faster to ship
* Less auth-related bugs
* Cleaner DX for Next.js App Router
* Easy to layer KYC + roles later

### Why NOT NextAuth for MVP:

* You’ll need to build:

  * Role management
  * Secure session handling
  * Edge-case auth flows
* More control, but slower
* Better suited **after PMF**, not before

### Best setup:

* **Clerk now**
* Abstract auth behind a service
* You can migrate to NextAuth later if needed

> **Decision:**
> ✅ **Use Clerk for MVP**

---

## 2. Stablecoin Choice

**USDC only or also EURC?**

### ✅ Recommendation: **USDC first, EURC later**

### Why:

* USDC on Stellar is:

  * Most liquid
  * Most trusted
  * Best supported by anchors
* Simplifies:

  * Accounting
  * Yield distribution
  * Smart contracts

### When to add EURC:

* EU installer partnerships
* EU regulatory alignment
* Phase 2 expansion

### Dev approach:

* Design contracts to be **multi-asset capable**
* Enable **only USDC** in MVP UI

> **Decision:**
> ✅ **USDC-only for MVP**
> 🟡 **EURC in roadmap**

---

## 3. Wallet Abstraction

**Custodial vs Non-custodial**

This is **critical**.

### ✅ Recommendation: **Custodial wallets for MVP**

### Why:

* Your users are:

  * Solar installers
  * ESG investors
  * Institutions
* They do **not** want:

  * Seed phrases
  * Wallet popups
  * Crypto UX friction

### Custodial advantages:

* Seamless UX
* Password-based access
* Easy recovery
* Compliance-friendly
* Matches real-world finance expectations

### Long-term vision:

* Offer **non-custodial option later**
* Power users can self-custody
* Institutions may demand custody integration

### Implementation suggestion:

* Platform-managed Stellar accounts
* Keys stored via:

  * HSM
  * Secure KMS
* Each user still has a **unique on-chain wallet**

> **Decision:**
> ✅ **Custodial wallets for MVP**
> 🟡 **Optional self-custody later**

---

## 4. KYC Provider

**Real KYC vs Mock for Prototype**

### ✅ Recommendation: **Mock KYC for MVP / Prototype**

### Why:

* KYC providers:

  * Are expensive
  * Add friction
  * Slow iteration
* Early stage focus:

  * Product flow
  * UX
  * Investor → Installer lifecycle

### How to do it properly:

* Implement a **KYC abstraction layer**
* Support:

  * `PENDING`
  * `APPROVED`
  * `REJECTED`
* Toggle mock vs real via config

### Later upgrade options:

* Sumsub
* Persona
* Onfido
* HyperVerge (India)

> **Decision:**
> ✅ **Mock KYC for MVP**
> 🟡 **Plug real provider post-validation**

---

## 5. MVP Priority

**Investor vs Installer Experience**

This is the most strategic question.

### ✅ Recommendation: **Prioritize Installer Experience FIRST**

### Why:

No installers → **No assets**
No assets → **No investors**

The document is very clear:

* Financing bottleneck is the real pain
* Installers are the supply side
* Investors come *because* assets exist

### MVP focus order:

1. Installer onboarding
2. Project submission
3. Approval flow
4. Asset tokenization
5. Basic investor funding UI

### Investor UI in MVP:

* Simple
* Functional
* Not polished
* Enough to fund projects

> **Decision:**
> ✅ **Installer-first MVP**
> 🟡 **Investor UX polish in Phase 2**

---

# Final Decisions Summary (TL;DR)

| Question       | Decision                       |
| -------------- | ------------------------------ |
| Authentication | **Clerk (managed)**            |
| Stablecoin     | **USDC only (MVP)**            |
| Wallets        | **Custodial wallets**          |
| KYC            | **Mock KYC flow**              |
| MVP Focus      | **Installer experience first** |

---
