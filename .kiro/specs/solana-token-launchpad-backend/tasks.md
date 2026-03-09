# Implementation Plan: Solana Token Launchpad Backend

## Overview

This implementation plan breaks down the Solana Token Launchpad Backend into sequential, incremental tasks. The system is a REST API built with Express.js and TypeScript, using PostgreSQL with Prisma ORM for data persistence, JWT authentication, and bcryptjs for password security. The implementation follows a layered architecture with clear separation between HTTP handling, business logic, and data access.

## Tasks

- [x] 1. Initialize project structure and dependencies
  - Create package.json with Express.js, Prisma, TypeScript, JWT, bcryptjs, and CORS dependencies
  - Set up TypeScript configuration (tsconfig.json)
  - Create directory structure: src/, src/middleware/, src/routes/, src/utils/
  - Create .env.example file with DATABASE_URL, JWT_SECRET, and PORT placeholders
  - _Requirements: 20.1, 20.2, 20.3, 21.3_

- [ ] 2. Set up Prisma schema and database
  - [x] 2.1 Create Prisma schema file with all 7 models
    - Define User model with id, email, password, name, createdAt fields
    - Define Launch model with all fields including relations to User
    - Define Tier model with pricing bracket fields and Launch relation
    - Define Whitelist model with address field and Launch relation
    - Define ReferralCode model with discount fields and Launch relation
    - Define Purchase model with transaction fields and relations to User and Launch
    - Define VestingSchedule model with vesting parameters and Launch relation
    - Add unique constraints for email, tier ranges, whitelist addresses, referral codes, and transaction signatures
    - Add cascade delete rules for related entities
    - _Requirements: 2.1, 5.1, 5.4, 5.5, 10.1, 13.1, 15.1, 19.3_

  - [ ]* 2.2 Write property test for Prisma schema validation
    - **Property 1: User email uniqueness**
    - **Validates: Requirements 2.4**

- [ ] 3. Implement authentication utilities
  - [x] 3.1 Create password hashing utilities
    - Implement hashPassword function using bcryptjs
    - Implement comparePassword function using bcryptjs
    - _Requirements: 22.1, 22.2_

  - [x] 3.2 Create JWT token utilities
    - Implement generateToken function that creates JWT with userId and email payload
    - Implement verifyToken function that validates and decodes JWT
    - Use JWT_SECRET from environment variables
    - _Requirements: 2.2, 3.1, 4.3, 20.3_

  - [ ]* 3.3 Write property tests for authentication utilities
    - **Property 3: Password hash uniqueness**
    - **Validates: Requirements 22.1**
    - **Property 4: JWT round-trip consistency**
    - **Validates: Requirements 2.2, 3.1**

- [ ] 4. Create authentication middleware
  - [x] 4.1 Implement JWT authentication middleware
    - Extract token from Authorization Bearer header
    - Verify token and attach user info (userId, email) to request object
    - Return 401 for missing or invalid tokens
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.2 Create authorization helper functions
    - Implement isLaunchCreator function to check if user owns a launch
    - _Requirements: 9.3, 10.4, 11.2, 12.3, 13.4, 14.2_

  - [ ]* 4.3 Write property tests for authentication middleware
    - **Property 5: Authentication rejection for invalid tokens**
    - **Validates: Requirements 4.2**

- [x] 5. Implement health check endpoint
  - Create GET /api/health route that returns status 200 with { status: "ok" }
  - _Requirements: 1.1, 1.2_

- [ ] 6. Implement user registration endpoint
  - [x] 6.1 Create POST /api/auth/register route handler
    - Validate required fields (email, password, name)
    - Check for existing email and return 409 if duplicate
    - Hash password using bcryptjs
    - Create User record in database
    - Generate JWT token
    - Return 201 with token and user object (id, email, name)
    - Return 400 for missing fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 22.1_

  - [ ]* 6.2 Write property tests for user registration
    - **Property 6: Registration idempotency for duplicate emails**
    - **Validates: Requirements 2.4**

- [ ] 7. Implement user login endpoint
  - [x] 7.1 Create POST /api/auth/login route handler
    - Validate email and password fields
    - Find user by email
    - Compare password using bcryptjs
    - Return 401 for invalid credentials or non-existent user
    - Generate JWT token on success
    - Return 200 with token and user object
    - _Requirements: 3.1, 3.2, 3.3, 22.2_

  - [ ]* 7.2 Write property tests for user login
    - **Property 7: Login failure for invalid credentials**
    - **Validates: Requirements 3.2, 3.3**

- [ ] 8. Implement launch status computation logic
  - [x] 8.1 Create computeLaunchStatus function
    - Implement priority-based status logic: SOLD_OUT > UPCOMING > ENDED > ACTIVE
    - Check if totalPurchased >= totalSupply for SOLD_OUT
    - Check if currentTime < startsAt for UPCOMING
    - Check if currentTime > endsAt for ENDED
    - Default to ACTIVE
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 8.2 Create getTotalPurchased helper function
    - Use Prisma aggregate to sum purchase amounts for a launch
    - _Requirements: 7.1, 19.2_

  - [ ]* 8.3 Write property tests for status computation
    - **Property 8: Status priority ordering**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
    - **Property 9: Status determinism**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [ ] 9. Implement create launch endpoint
  - [x] 9.1 Create POST /api/launches route handler (authenticated)
    - Validate required fields (name, symbol, totalSupply, pricePerToken, startsAt, endsAt, maxPerWallet, description)
    - Create Launch record with authenticated user as creator
    - Handle optional tiers array and create Tier records
    - Handle optional vesting object and create VestingSchedule record
    - Compute and include status in response
    - Return 201 with launch object
    - Return 400 for missing fields
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 9.2 Write property tests for launch creation
    - **Property 10: Launch creator assignment**
    - **Validates: Requirements 5.2**
    - **Property 11: Tier ordering consistency**
    - **Validates: Requirements 5.4**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement list launches endpoint
  - [x] 11.1 Create GET /api/launches route handler (public)
    - Implement pagination with page and limit query parameters
    - Filter by status query parameter if provided
    - Compute status for each launch using computeLaunchStatus
    - Return 200 with launches array, total, page, and limit
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 11.2 Write property tests for launch listing
    - **Property 12: Pagination consistency**
    - **Validates: Requirements 6.3**
    - **Property 13: Status filter correctness**
    - **Validates: Requirements 6.4**

- [x] 12. Implement get single launch endpoint
  - Create GET /api/launches/:id route handler (public)
  - Fetch launch with all relations (tiers, vestingSchedule, creator)
  - Compute and include status
  - Return 200 with launch object
  - Return 404 for non-existent launch
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 13. Implement update launch endpoint
  - [x] 13.1 Create PUT /api/launches/:id route handler (authenticated)
    - Check if launch exists, return 404 if not
    - Verify authenticated user is the creator using isLaunchCreator
    - Return 403 if not creator
    - Update launch fields
    - Return 200 with updated launch object
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 13.2 Write property tests for launch updates
    - **Property 14: Creator-only update enforcement**
    - **Validates: Requirements 9.3**

- [ ] 14. Implement whitelist management endpoints
  - [x] 14.1 Create POST /api/launches/:id/whitelist route handler (authenticated, creator only)
    - Verify user is creator, return 403 if not
    - Accept addresses array
    - Skip duplicate addresses using Prisma's skipDuplicates
    - Return 200 with added count and total count
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 14.2 Create GET /api/launches/:id/whitelist route handler (authenticated, creator only)
    - Verify user is creator, return 403 if not
    - Fetch all whitelist entries for launch
    - Return 200 with addresses array and total count
    - _Requirements: 11.1, 11.2_

  - [x] 14.3 Create DELETE /api/launches/:id/whitelist/:address route handler (authenticated, creator only)
    - Verify user is creator, return 403 if not
    - Delete whitelist entry
    - Return 404 if address not found
    - Return 200 with removed: true on success
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 14.4 Write property tests for whitelist management
    - **Property 15: Whitelist duplicate prevention**
    - **Validates: Requirements 10.2**
    - **Property 16: Whitelist creator-only access**
    - **Validates: Requirements 10.4, 11.2, 12.3**

- [ ] 15. Implement referral code endpoints
  - [x] 15.1 Create POST /api/launches/:id/referrals route handler (authenticated, creator only)
    - Verify user is creator, return 403 if not
    - Validate code, discountPercent, and maxUses fields
    - Create ReferralCode with usedCount initialized to 0
    - Return 409 for duplicate code
    - Return 201 with referral code object
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 15.2 Create GET /api/launches/:id/referrals route handler (authenticated, creator only)
    - Verify user is creator, return 403 if not
    - Fetch all referral codes for launch
    - Return 200 with array of referral code objects including usedCount
    - _Requirements: 14.1, 14.2_

  - [ ]* 15.3 Write property tests for referral codes
    - **Property 17: Referral code uniqueness per launch**
    - **Validates: Requirements 13.3**
    - **Property 18: Referral code initial state**
    - **Validates: Requirements 13.2**

- [x] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement tiered pricing calculation
  - [x] 17.1 Create calculateTieredCost function
    - Sort tiers by minAmount ascending
    - Fill tiers sequentially based on capacity (maxAmount - minAmount)
    - Apply tier pricePerToken to amount in each tier
    - Use base pricePerToken for remaining amount beyond all tiers
    - Return total cost
    - Handle case with no tiers (use base price)
    - _Requirements: 15.2, 15.3, 15.4_

  - [ ]* 17.2 Write property tests for tiered pricing
    - **Property 19: Tiered pricing monotonicity**
    - **Validates: Requirements 15.2**
    - **Property 20: Tiered pricing with no tiers equals flat pricing**
    - **Validates: Requirements 15.4**
    - **Property 21: Tiered pricing tier boundary correctness**
    - **Validates: Requirements 15.2, 15.3**

- [ ] 18. Implement referral discount logic
  - [x] 18.1 Create applyReferralDiscount function
    - Calculate discount amount as totalCost * (discountPercent / 100)
    - Return totalCost - discountAmount
    - _Requirements: 16.1_

  - [x] 18.2 Create processReferralCode function
    - Validate referral code exists for launch
    - Check usedCount < maxUses
    - Apply discount using applyReferralDiscount
    - Increment usedCount
    - Return final cost and referral code ID
    - Throw errors for invalid code or exceeded usage
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ]* 18.3 Write property tests for referral discounts
    - **Property 22: Referral discount bounds**
    - **Validates: Requirements 16.1**
    - **Property 23: Referral code usage limit enforcement**
    - **Validates: Requirements 16.4**

- [ ] 19. Implement purchase validation logic
  - [x] 19.1 Create validatePurchase function
    - Fetch launch with whitelist and purchases
    - Check launch status is ACTIVE using computeLaunchStatus
    - Validate whitelist if non-empty (walletAddress must be in whitelist)
    - Check per-user purchase limit (sum of user's purchases + new amount <= maxPerWallet)
    - Check total supply limit (total purchases + new amount <= totalSupply)
    - Check for duplicate transaction signature
    - Return validation result with error message if invalid
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9_

  - [ ]* 19.2 Write property tests for purchase validation
    - **Property 24: Purchase validation rejects non-ACTIVE launches**
    - **Validates: Requirements 17.1, 17.2, 17.3**
    - **Property 25: Whitelist enforcement**
    - **Validates: Requirements 17.4, 17.5**
    - **Property 26: Per-user purchase limit enforcement**
    - **Validates: Requirements 17.6**
    - **Property 27: Total supply limit enforcement**
    - **Validates: Requirements 17.7**
    - **Property 28: Transaction signature uniqueness**
    - **Validates: Requirements 17.8**

- [ ] 20. Implement token purchase endpoint
  - [x] 20.1 Create POST /api/launches/:id/purchase route handler (authenticated)
    - Validate required fields (walletAddress, amount, txSignature)
    - Run validatePurchase and return 400 with error if invalid
    - Fetch launch with tiers
    - Calculate totalCost using calculateTieredCost
    - If referralCode provided, process using processReferralCode
    - Create Purchase record with userId, launchId, walletAddress, amount, totalCost, txSignature
    - Return 201 with purchase object including computed totalCost
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4, 17.1-17.9_

  - [ ]* 20.2 Write property tests for token purchase
    - **Property 29: Purchase cost calculation correctness**
    - **Validates: Requirements 15.2, 15.3, 15.4, 15.5**
    - **Property 30: Purchase with referral discount correctness**
    - **Validates: Requirements 16.1, 16.2**

- [ ] 21. Implement view purchases endpoint
  - [x] 21.1 Create GET /api/launches/:id/purchases route handler (authenticated)
    - Return 401 for unauthenticated requests
    - Check if user is creator using isLaunchCreator
    - If creator, return all purchases for launch
    - If not creator, return only purchases where userId matches authenticated user
    - Return 200 with array of purchase objects (id, userId, walletAddress, amount, totalCost, txSignature)
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ]* 21.2 Write property tests for purchase viewing
    - **Property 31: Purchase visibility for creators**
    - **Validates: Requirements 18.2**
    - **Property 32: Purchase visibility for non-creators**
    - **Validates: Requirements 18.3**

- [x] 22. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Implement vesting calculation logic
  - [x] 23.1 Create calculateVesting function
    - Handle no vesting schedule case (all tokens immediately available)
    - Calculate tgeAmount as floor(totalPurchased * tgePercent / 100)
    - Calculate days since launch ended
    - Check if cliff period has passed
    - If cliff passed, calculate linear vesting over vestingDays
    - Compute vestedAmount, lockedAmount, and claimableAmount
    - Return VestingInfo object with all fields
    - _Requirements: 19.3, 19.4, 19.5, 19.6, 19.7_

  - [ ]* 23.2 Write property tests for vesting calculation
    - **Property 33: Vesting without schedule equals immediate availability**
    - **Validates: Requirements 19.7**
    - **Property 34: TGE amount calculation**
    - **Validates: Requirements 19.3**
    - **Property 35: Cliff period enforcement**
    - **Validates: Requirements 19.4**
    - **Property 36: Linear vesting correctness**
    - **Validates: Requirements 19.4**
    - **Property 37: Vesting amount bounds**
    - **Validates: Requirements 19.3, 19.4, 19.5, 19.6**

- [ ] 24. Implement vesting schedule endpoint
  - [x] 24.1 Create GET /api/launches/:id/vesting route handler (public)
    - Validate walletAddress query parameter, return 400 if missing
    - Check if launch exists, return 404 if not
    - Fetch launch with vestingSchedule
    - Calculate totalPurchased by summing purchases for walletAddress
    - Use calculateVesting to compute vesting info
    - Return 200 with vesting info object
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9_

  - [ ]* 24.2 Write property tests for vesting endpoint
    - **Property 38: Vesting calculation for wallet address**
    - **Validates: Requirements 19.1, 19.2**

- [ ] 25. Set up Express server and wire all routes
  - [x] 25.1 Create main server file (src/index.ts)
    - Initialize Express app
    - Configure CORS middleware
    - Configure JSON body parser
    - Mount health check route at /api/health
    - Mount auth routes at /api/auth (register, login)
    - Mount launch routes at /api/launches with all sub-routes
    - Add error handling middleware
    - Listen on port from environment variable (default 3000)
    - _Requirements: 20.1_

  - [x] 25.2 Create Prisma client singleton
    - Initialize PrismaClient instance
    - Export for use in route handlers
    - _Requirements: 21.1, 21.2, 21.3_

  - [x] 25.3 Add start script to package.json
    - Add script to run prisma generate
    - Add script to run prisma db push
    - Add script to compile TypeScript and start server
    - _Requirements: 21.1, 21.2_

- [ ] 26. Final checkpoint - Ensure all tests pass and API is functional
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breakpoints
- Property tests validate universal correctness properties from the design document
- The implementation follows a bottom-up approach: utilities → middleware → business logic → endpoints → integration
- All endpoints include proper error handling and status codes as specified in requirements
- Authentication and authorization are enforced consistently across protected routes
