# Design Document: Solana Token Launchpad Backend

## Overview

The Solana Token Launchpad Backend is a REST API built with Express.js that enables users to create and manage token sale events (launches) with sophisticated features including tiered pricing, vesting schedules, whitelist management, and referral codes. The system uses PostgreSQL with Prisma ORM for data persistence and implements JWT-based authentication with bcryptjs for password security.

The API serves as the backend for a token launchpad platform where:
- Users can register and authenticate to access protected features
- Creators can configure token launches with customizable parameters
- Buyers can purchase tokens with automatic price calculation based on volume tiers
- The system enforces purchase limits, whitelist restrictions, and tracks vesting schedules
- Referral codes provide discounts and track promotional effectiveness

Key technical characteristics:
- RESTful API design with clear resource-based routing
- Stateless authentication using JWT tokens
- Computed fields (launch status) derived from database state and current time
- Complex business logic for tiered pricing and vesting calculations
- Sybil protection through per-user purchase limits and transaction signature tracking

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│                    (HTTP/JSON Requests)                      │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      Express.js API                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                        │   │
│  │  • CORS                                              │   │
│  │  • JSON Body Parser                                  │   │
│  │  • JWT Authentication (protected routes)             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Route Handlers                          │   │
│  │  • /api/health                                       │   │
│  │  • /api/auth/*                                       │   │
│  │  • /api/launches/*                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Business Logic Layer                       │   │
│  │  • Status Computation                                │   │
│  │  • Tiered Pricing Calculator                         │   │
│  │  • Vesting Schedule Calculator                       │   │
│  │  • Purchase Validation                               │   │
│  │  • Referral Code Handler                             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      Prisma ORM                              │
│                   (Type-safe queries)                        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    PostgreSQL Database                       │
│  • Users                    • Purchases                      │
│  • Launches                 • Vesting_Schedules              │
│  • Tiers                    • Referral_Codes                 │
│  • Whitelists                                                │
└──────────────────────────────────────────────────────────────┘
```

### Architectural Patterns

1. **Layered Architecture**: Clear separation between HTTP handling, business logic, and data access
2. **Middleware Pipeline**: Request processing through authentication, validation, and error handling layers
3. **Repository Pattern**: Prisma client abstracts database operations
4. **Computed Properties**: Launch status derived at query time rather than stored
5. **Stateless Authentication**: JWT tokens enable horizontal scaling

### Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js (REST API)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken library)
- **Password Hashing**: bcryptjs
- **Port**: 3000

## Components and Interfaces

### Database Schema (Prisma Models)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  password  String     // bcrypt hashed
  name      String
  createdAt DateTime   @default(now())
  
  launches  Launch[]   @relation("CreatorLaunches")
  purchases Purchase[]
}

model Launch {
  id            String    @id @default(uuid())
  name          String
  symbol        String
  description   String
  totalSupply   Float
  pricePerToken Float
  startsAt      DateTime
  endsAt        DateTime
  maxPerWallet  Float
  createdAt     DateTime  @default(now())
  
  creatorId     String
  creator       User      @relation("CreatorLaunches", fields: [creatorId], references: [id])
  
  tiers             Tier[]
  whitelist         Whitelist[]
  referralCodes     ReferralCode[]
  purchases         Purchase[]
  vestingSchedule   VestingSchedule?
}

model Tier {
  id            String  @id @default(uuid())
  minAmount     Float
  maxAmount     Float
  pricePerToken Float
  
  launchId      String
  launch        Launch  @relation(fields: [launchId], references: [id], onDelete: Cascade)
  
  @@unique([launchId, minAmount])
}

model Whitelist {
  id        String   @id @default(uuid())
  address   String
  addedAt   DateTime @default(now())
  
  launchId  String
  launch    Launch   @relation(fields: [launchId], references: [id], onDelete: Cascade)
  
  @@unique([launchId, address])
}

model ReferralCode {
  id              String   @id @default(uuid())
  code            String
  discountPercent Float
  maxUses         Int
  usedCount       Int      @default(0)
  createdAt       DateTime @default(now())
  
  launchId        String
  launch          Launch   @relation(fields: [launchId], references: [id], onDelete: Cascade)
  
  @@unique([launchId, code])
}

model Purchase {
  id          String   @id @default(uuid())
  amount      Float
  totalCost   Float
  walletAddress String
  txSignature String
  purchasedAt DateTime @default(now())
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  launchId    String
  launch      Launch   @relation(fields: [launchId], references: [id])
  
  @@unique([launchId, txSignature])
}

model VestingSchedule {
  id          String @id @default(uuid())
  tgePercent  Float  // Percentage released at TGE (0-100)
  cliffDays   Int    // Days before vesting starts
  vestingDays Int    // Days over which remaining tokens vest linearly
  
  launchId    String @unique
  launch      Launch @relation(fields: [launchId], references: [id], onDelete: Cascade)
}
```

### API Routes Structure

```
/api
├── /health
│   └── GET - Health check (public)
│
├── /auth
│   ├── POST /register - Create new user account (public)
│   └── POST /login - Authenticate user (public)
│
└── /launches
    ├── GET - List all launches with pagination and filtering (public)
    ├── POST - Create new launch (authenticated)
    ├── /:id
    │   ├── GET - Get single launch details (public)
    │   ├── PUT - Update launch (authenticated, creator only)
    │   ├── /whitelist
    │   │   ├── GET - View whitelist (authenticated, creator only)
    │   │   ├── POST - Add addresses to whitelist (authenticated, creator only)
    │   │   └── /:address
    │   │       └── DELETE - Remove address from whitelist (authenticated, creator only)
    │   ├── /referrals
    │   │   ├── GET - List referral codes (authenticated, creator only)
    │   │   └── POST - Create referral code (authenticated, creator only)
    │   ├── /purchase
    │   │   └── POST - Purchase tokens (authenticated)
    │   ├── /purchases
    │   │   └── GET - View purchases (authenticated, filtered by role)
    │   └── /vesting
    │       └── GET - Calculate vesting schedule (public)
```

### Authentication Middleware

The JWT authentication middleware extracts and verifies tokens from the Authorization header:

```typescript
interface JWTPayload {
  userId: string;
  email: string;
}

// Middleware function
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Authorization Helpers

```typescript
// Check if authenticated user is the creator of a launch
async function isLaunchCreator(userId: string, launchId: string): Promise<boolean> {
  const launch = await prisma.launch.findUnique({
    where: { id: launchId },
    select: { creatorId: true }
  });
  
  return launch?.creatorId === userId;
}
```

## Data Models

### Core Entities

**User**
- Represents a registered account holder
- Can create launches (as creator) and make purchases
- Password stored as bcrypt hash
- Identified by UUID

**Launch**
- Represents a token sale event
- Contains timing (startsAt, endsAt), supply, and pricing configuration
- Status is computed dynamically based on time and purchase totals
- Owned by a creator (User)

**Tier**
- Defines volume-based pricing brackets for a launch
- Multiple tiers per launch, ordered by minAmount
- Each tier has capacity (maxAmount - minAmount) and pricePerToken

**Whitelist**
- Controls which wallet addresses can purchase from a launch
- Empty whitelist = no restrictions
- Non-empty whitelist = only listed addresses can purchase

**ReferralCode**
- Provides percentage-based discounts on purchases
- Tracks usage count against maximum uses
- Unique per launch

**Purchase**
- Records a token acquisition transaction
- Links user, wallet address, and transaction signature
- Stores computed totalCost after tier pricing and discounts

**VestingSchedule**
- Defines token release schedule for a launch
- TGE percentage released immediately
- Cliff period before vesting begins
- Linear vesting over specified days

### Computed Fields

**Launch Status** (not stored, computed on read):
- `SOLD_OUT`: Total purchases >= totalSupply
- `UPCOMING`: Current time < startsAt (and not sold out)
- `ENDED`: Current time > endsAt (and not sold out)
- `ACTIVE`: Current time between startsAt and endsAt (and not sold out)

Priority order: SOLD_OUT > UPCOMING > ENDED > ACTIVE

## Business Logic

### Status Computation Algorithm

```typescript
enum LaunchStatus {
  ACTIVE = 'ACTIVE',
  UPCOMING = 'UPCOMING',
  ENDED = 'ENDED',
  SOLD_OUT = 'SOLD_OUT'
}

function computeLaunchStatus(
  launch: Launch,
  totalPurchased: number,
  currentTime: Date
): LaunchStatus {
  // Priority 1: Check if sold out
  if (totalPurchased >= launch.totalSupply) {
    return LaunchStatus.SOLD_OUT;
  }
  
  // Priority 2: Check if upcoming
  if (currentTime < launch.startsAt) {
    return LaunchStatus.UPCOMING;
  }
  
  // Priority 3: Check if ended
  if (currentTime > launch.endsAt) {
    return LaunchStatus.ENDED;
  }
  
  // Default: Active
  return LaunchStatus.ACTIVE;
}

// Helper to get total purchased for a launch
async function getTotalPurchased(launchId: string): Promise<number> {
  const result = await prisma.purchase.aggregate({
    where: { launchId },
    _sum: { amount: true }
  });
  
  return result._sum.amount || 0;
}
```

### Tiered Pricing Calculation

The tiered pricing system fills tiers sequentially from lowest to highest, applying each tier's price to the portion of the purchase that falls within that tier's range.

```typescript
interface TierConfig {
  minAmount: number;
  maxAmount: number;
  pricePerToken: number;
}

function calculateTieredCost(
  amount: number,
  tiers: TierConfig[],
  basePricePerToken: number
): number {
  if (tiers.length === 0) {
    return amount * basePricePerToken;
  }
  
  // Sort tiers by minAmount ascending
  const sortedTiers = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
  
  let remainingAmount = amount;
  let totalCost = 0;
  
  for (const tier of sortedTiers) {
    if (remainingAmount <= 0) break;
    
    const tierCapacity = tier.maxAmount - tier.minAmount;
    const amountInTier = Math.min(remainingAmount, tierCapacity);
    
    totalCost += amountInTier * tier.pricePerToken;
    remainingAmount -= amountInTier;
  }
  
  // Any remaining amount uses base price
  if (remainingAmount > 0) {
    totalCost += remainingAmount * basePricePerToken;
  }
  
  return totalCost;
}
```

**Example**:
- Launch: pricePerToken = 1.0
- Tiers:
  - Tier 1: 0-1000 tokens @ 0.8 per token
  - Tier 2: 1000-5000 tokens @ 0.9 per token
- Purchase: 6000 tokens
- Calculation:
  - First 1000 tokens: 1000 × 0.8 = 800
  - Next 4000 tokens: 4000 × 0.9 = 3600
  - Remaining 1000 tokens: 1000 × 1.0 = 1000
  - Total: 5400

### Referral Code Discount Application

```typescript
function applyReferralDiscount(
  totalCost: number,
  discountPercent: number
): number {
  const discountAmount = totalCost * (discountPercent / 100);
  return totalCost - discountAmount;
}

// Validation and application flow
async function processReferralCode(
  launchId: string,
  code: string,
  totalCost: number
): Promise<{ finalCost: number; referralCodeId: string }> {
  const referralCode = await prisma.referralCode.findUnique({
    where: { launchId_code: { launchId, code } }
  });
  
  if (!referralCode) {
    throw new Error('Invalid referral code');
  }
  
  if (referralCode.usedCount >= referralCode.maxUses) {
    throw new Error('Referral code usage limit reached');
  }
  
  const finalCost = applyReferralDiscount(totalCost, referralCode.discountPercent);
  
  // Increment usage count
  await prisma.referralCode.update({
    where: { id: referralCode.id },
    data: { usedCount: { increment: 1 } }
  });
  
  return { finalCost, referralCodeId: referralCode.id };
}
```

### Vesting Schedule Calculation

The vesting calculation determines how many tokens are available to claim based on time elapsed since the launch ended.

```typescript
interface VestingInfo {
  totalPurchased: number;
  tgeAmount: number;
  vestedAmount: number;
  lockedAmount: number;
  claimableAmount: number;
}

function calculateVesting(
  totalPurchased: number,
  vestingSchedule: VestingSchedule | null,
  launchEndsAt: Date,
  currentTime: Date
): VestingInfo {
  // No vesting schedule = all tokens immediately available
  if (!vestingSchedule) {
    return {
      totalPurchased,
      tgeAmount: totalPurchased,
      vestedAmount: totalPurchased,
      lockedAmount: 0,
      claimableAmount: totalPurchased
    };
  }
  
  const { tgePercent, cliffDays, vestingDays } = vestingSchedule;
  
  // TGE amount (available immediately at launch end)
  const tgeAmount = Math.floor(totalPurchased * (tgePercent / 100));
  
  // Calculate time-based vesting
  const daysSinceLaunchEnd = Math.floor(
    (currentTime.getTime() - launchEndsAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  let vestedAmount = tgeAmount;
  
  // Check if cliff period has passed
  if (daysSinceLaunchEnd >= cliffDays) {
    const vestingDaysElapsed = daysSinceLaunchEnd - cliffDays;
    const vestingAmount = totalPurchased - tgeAmount;
    
    if (vestingDaysElapsed >= vestingDays) {
      // Fully vested
      vestedAmount = totalPurchased;
    } else {
      // Linear vesting
      const vestedFromSchedule = Math.floor(
        (vestingAmount * vestingDaysElapsed) / vestingDays
      );
      vestedAmount = tgeAmount + vestedFromSchedule;
    }
  }
  
  const lockedAmount = totalPurchased - vestedAmount;
  const claimableAmount = vestedAmount;
  
  return {
    totalPurchased,
    tgeAmount,
    vestedAmount,
    lockedAmount,
    claimableAmount
  };
}
```

**Vesting Timeline Example**:
- Total purchased: 10,000 tokens
- TGE: 20% (2,000 tokens available immediately)
- Cliff: 30 days
- Vesting: 180 days

Timeline:
- Day 0 (launch ends): 2,000 tokens claimable
- Day 1-29: Still 2,000 tokens claimable (cliff period)
- Day 30: Cliff ends, linear vesting begins
- Day 30-210: Linear release of remaining 8,000 tokens
  - Day 120: 2,000 + (8,000 × 90/180) = 6,000 tokens claimable
- Day 210+: All 10,000 tokens claimable

### Purchase Validation Logic

```typescript
interface PurchaseValidation {
  valid: boolean;
  error?: string;
}

async function validatePurchase(
  userId: string,
  launchId: string,
  walletAddress: string,
  amount: number,
  txSignature: string
): Promise<PurchaseValidation> {
  // 1. Fetch launch with related data
  const launch = await prisma.launch.findUnique({
    where: { id: launchId },
    include: {
      whitelist: true,
      purchases: true
    }
  });
  
  if (!launch) {
    return { valid: false, error: 'Launch not found' };
  }
  
  // 2. Check launch status
  const totalPurchased = launch.purchases.reduce((sum, p) => sum + p.amount, 0);
  const status = computeLaunchStatus(launch, totalPurchased, new Date());
  
  if (status !== LaunchStatus.ACTIVE) {
    return { valid: false, error: `Launch is ${status}` };
  }
  
  // 3. Check whitelist
  if (launch.whitelist.length > 0) {
    const isWhitelisted = launch.whitelist.some(w => w.address === walletAddress);
    if (!isWhitelisted) {
      return { valid: false, error: 'Wallet not whitelisted' };
    }
  }
  
  // 4. Check per-user purchase limit
  const userPurchases = launch.purchases
    .filter(p => p.userId === userId)
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (userPurchases + amount > launch.maxPerWallet) {
    return { valid: false, error: 'Exceeds max per wallet' };
  }
  
  // 5. Check total supply
  if (totalPurchased + amount > launch.totalSupply) {
    return { valid: false, error: 'Exceeds total supply' };
  }
  
  // 6. Check duplicate transaction signature
  const duplicateTx = launch.purchases.some(p => p.txSignature === txSignature);
  if (duplicateTx) {
    return { valid: false, error: 'Transaction signature already used' };
  }
  
  return { valid: true };
}
```

