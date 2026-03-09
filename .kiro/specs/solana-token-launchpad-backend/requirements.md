# Requirements Document

## Introduction

This document specifies the requirements for a Solana Token Launchpad Backend REST API. The system enables users to register, create token launches with configurable pricing tiers and vesting schedules, manage whitelists, apply referral codes for discounts, purchase tokens, and track vesting schedules. The API is database-backed using PostgreSQL and implements JWT-based authentication.

## Glossary

- **API**: The REST API server that handles all HTTP requests and responses
- **User**: A registered account holder who can create launches or purchase tokens
- **Launch**: A token sale event with defined parameters including supply, pricing, and timing
- **Whitelist**: A list of wallet addresses permitted to purchase tokens for a specific launch
- **Tier**: A pricing bracket that defines cost per token for a specific purchase amount range
- **Referral_Code**: A discount code that reduces purchase cost and tracks usage
- **Purchase**: A recorded token acquisition transaction linked to a user and wallet
- **Vesting_Schedule**: A time-based token release plan with cliff and linear vesting periods
- **TGE**: Token Generation Event - the initial token release percentage available immediately
- **Wallet_Address**: A Solana blockchain address used for token purchases
- **Creator**: The user who created a specific launch
- **JWT**: JSON Web Token used for authentication
- **Transaction_Signature**: A unique Solana blockchain transaction identifier

## Requirements

### Requirement 1: Health Check Endpoint

**User Story:** As a system administrator, I want a health check endpoint, so that I can monitor API availability.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/health, THE API SHALL return status code 200
2. WHEN a GET request is made to /api/health, THE API SHALL return a JSON response with status field equal to "ok"

### Requirement 2: User Registration

**User Story:** As a new user, I want to register an account, so that I can access authenticated features.

#### Acceptance Criteria

1. WHEN a POST request to /api/auth/register contains valid email, password, and name, THE API SHALL create a new User account
2. WHEN a User account is successfully created, THE API SHALL return status code 201 with a JWT token and user object containing id, email, and name
3. WHEN a POST request to /api/auth/register is missing required fields, THE API SHALL return status code 400
4. WHEN a POST request to /api/auth/register contains an email that already exists, THE API SHALL return status code 409

### Requirement 3: User Authentication

**User Story:** As a registered user, I want to log in, so that I can access my account and perform authenticated actions.

#### Acceptance Criteria

1. WHEN a POST request to /api/auth/login contains valid email and password credentials, THE API SHALL return status code 200 with a JWT token and user object
2. WHEN a POST request to /api/auth/login contains invalid credentials, THE API SHALL return status code 401
3. WHEN a POST request to /api/auth/login contains an email for a non-existent User, THE API SHALL return status code 401

### Requirement 4: JWT Authorization

**User Story:** As a system, I want to protect authenticated endpoints, so that only authorized users can access protected resources.

#### Acceptance Criteria

1. WHEN a protected endpoint receives a request without an Authorization header, THE API SHALL return status code 401
2. WHEN a protected endpoint receives a request with an invalid JWT token, THE API SHALL return status code 401
3. WHEN a protected endpoint receives a request with a valid JWT token in the Authorization Bearer header, THE API SHALL process the request

### Requirement 5: Create Token Launch

**User Story:** As an authenticated user, I want to create a token launch, so that I can offer tokens for sale.

#### Acceptance Criteria

1. WHEN an authenticated User submits a POST request to /api/launches with name, symbol, totalSupply, pricePerToken, startsAt, endsAt, maxPerWallet, and description, THE API SHALL create a Launch and return status code 201
2. WHEN a Launch is created, THE API SHALL assign the authenticated User as the Creator
3. WHEN a Launch is created, THE API SHALL compute and include the status field in the response
4. WHERE tiers array is provided, THE API SHALL store the tier configuration with minAmount, maxAmount, and pricePerToken for each tier
5. WHERE vesting object is provided, THE API SHALL store the Vesting_Schedule with cliffDays, vestingDays, and tgePercent
6. WHEN a POST request to /api/launches is missing required fields, THE API SHALL return status code 400

### Requirement 6: List Token Launches

**User Story:** As any user, I want to view available token launches, so that I can discover investment opportunities.

#### Acceptance Criteria

1. THE API SHALL allow unauthenticated access to GET /api/launches
2. WHEN a GET request to /api/launches is received, THE API SHALL return status code 200 with launches array, total count, page number, and limit
3. WHEN a GET request to /api/launches includes page and limit query parameters, THE API SHALL return paginated results
4. WHEN a GET request to /api/launches includes a status query parameter, THE API SHALL return only launches matching that computed status
5. FOR ALL launches returned, THE API SHALL compute and include the status field based on current time and purchase totals

### Requirement 7: Computed Launch Status

**User Story:** As a user, I want to see the current status of each launch, so that I know if I can participate.

#### Acceptance Criteria

1. WHEN total purchased amount is greater than or equal to totalSupply, THE API SHALL compute status as SOLD_OUT
2. WHEN current time is less than startsAt and the Launch is not sold out, THE API SHALL compute status as UPCOMING
3. WHEN current time is greater than endsAt and the Launch is not sold out, THE API SHALL compute status as ENDED
4. WHEN current time is between startsAt and endsAt and the Launch is not sold out, THE API SHALL compute status as ACTIVE

### Requirement 8: Get Single Launch

**User Story:** As any user, I want to view details of a specific launch, so that I can evaluate the opportunity.

#### Acceptance Criteria

1. THE API SHALL allow unauthenticated access to GET /api/launches/:id
2. WHEN a GET request to /api/launches/:id is received for an existing Launch, THE API SHALL return status code 200 with the Launch object including computed status
3. WHEN a GET request to /api/launches/:id is received for a non-existent Launch, THE API SHALL return status code 404

### Requirement 9: Update Token Launch

**User Story:** As a launch creator, I want to update my launch details, so that I can correct errors or adjust parameters.

#### Acceptance Criteria

1. WHEN an authenticated User who is the Creator submits a PUT request to /api/launches/:id, THE API SHALL update the Launch and return status code 200
2. WHEN an unauthenticated request is made to PUT /api/launches/:id, THE API SHALL return status code 401
3. WHEN an authenticated User who is not the Creator attempts to update a Launch, THE API SHALL return status code 403
4. WHEN a PUT request to /api/launches/:id references a non-existent Launch, THE API SHALL return status code 404

### Requirement 10: Add Whitelist Addresses

**User Story:** As a launch creator, I want to add wallet addresses to my whitelist, so that I can control who can purchase tokens.

#### Acceptance Criteria

1. WHEN the Creator submits a POST request to /api/launches/:id/whitelist with an addresses array, THE API SHALL add the addresses to the Whitelist
2. WHEN adding addresses to a Whitelist, THE API SHALL skip duplicate addresses
3. WHEN addresses are successfully added, THE API SHALL return status code 200 with the count of added addresses and total addresses
4. WHEN a non-Creator attempts to add addresses to a Whitelist, THE API SHALL return status code 403

### Requirement 11: View Whitelist

**User Story:** As a launch creator, I want to view my whitelist, so that I can verify which addresses are permitted.

#### Acceptance Criteria

1. WHEN the Creator submits a GET request to /api/launches/:id/whitelist, THE API SHALL return status code 200 with addresses array and total count
2. WHEN a non-Creator attempts to view a Whitelist, THE API SHALL return status code 403

### Requirement 12: Remove Whitelist Address

**User Story:** As a launch creator, I want to remove addresses from my whitelist, so that I can revoke access.

#### Acceptance Criteria

1. WHEN the Creator submits a DELETE request to /api/launches/:id/whitelist/:address for an existing address, THE API SHALL remove the address and return status code 200 with removed field set to true
2. WHEN a DELETE request references a non-existent address, THE API SHALL return status code 404
3. WHEN a non-Creator attempts to remove an address, THE API SHALL return status code 403

### Requirement 13: Create Referral Code

**User Story:** As a launch creator, I want to create referral codes, so that I can offer discounts and track promotional effectiveness.

#### Acceptance Criteria

1. WHEN the Creator submits a POST request to /api/launches/:id/referrals with code, discountPercent, and maxUses, THE API SHALL create a Referral_Code and return status code 201
2. WHEN a Referral_Code is created, THE API SHALL initialize usedCount to 0
3. WHEN a POST request attempts to create a duplicate code for the same Launch, THE API SHALL return status code 409
4. WHEN a non-Creator attempts to create a Referral_Code, THE API SHALL return status code 403

### Requirement 14: List Referral Codes

**User Story:** As a launch creator, I want to view all referral codes for my launch, so that I can monitor usage.

#### Acceptance Criteria

1. WHEN the Creator submits a GET request to /api/launches/:id/referrals, THE API SHALL return status code 200 with an array of Referral_Code objects including usedCount
2. WHEN a non-Creator attempts to list referral codes, THE API SHALL return status code 403

### Requirement 15: Token Purchase with Tiered Pricing

**User Story:** As an authenticated user, I want to purchase tokens with tiered pricing, so that I can benefit from volume discounts.

#### Acceptance Criteria

1. WHEN an authenticated User submits a POST request to /api/launches/:id/purchase with walletAddress, amount, and txSignature for an ACTIVE Launch, THE API SHALL create a Purchase and return status code 201
2. WHERE the Launch has tiers configured, THE API SHALL calculate totalCost by filling tiers in order based on each tier capacity
3. WHERE purchase amount exceeds all tier capacities, THE API SHALL calculate remaining cost using the flat pricePerToken
4. WHERE the Launch has no tiers configured, THE API SHALL calculate totalCost as amount multiplied by pricePerToken
5. WHEN a Purchase is created, THE API SHALL include the computed totalCost in the response

### Requirement 16: Referral Code Discount Application

**User Story:** As a user, I want to use referral codes, so that I can receive discounts on token purchases.

#### Acceptance Criteria

1. WHERE a referralCode is provided in the purchase request, THE API SHALL apply the discountPercent to the totalCost
2. WHERE a referralCode is provided and valid, THE API SHALL increment the usedCount for that Referral_Code
3. WHEN a referralCode is invalid for the Launch, THE API SHALL return status code 400
4. WHEN a referralCode has usedCount greater than or equal to maxUses, THE API SHALL return status code 400

### Requirement 17: Purchase Validation and Sybil Protection

**User Story:** As a system, I want to enforce purchase limits per user, so that I can prevent abuse and ensure fair distribution.

#### Acceptance Criteria

1. WHEN a purchase would cause the Launch status to be UPCOMING, THE API SHALL return status code 400
2. WHEN a purchase would cause the Launch status to be ENDED, THE API SHALL return status code 400
3. WHEN a purchase would cause the Launch status to be SOLD_OUT, THE API SHALL return status code 400
4. WHEN a Whitelist exists for the Launch and the walletAddress is not in the Whitelist, THE API SHALL return status code 400
5. WHERE the Whitelist is empty, THE API SHALL allow any Wallet_Address to purchase
6. WHEN the sum of all Purchase amounts by the same User for the Launch plus the new amount exceeds maxPerWallet, THE API SHALL return status code 400
7. WHEN the sum of all Purchase amounts for the Launch plus the new amount exceeds totalSupply, THE API SHALL return status code 400
8. WHEN a txSignature already exists for the Launch, THE API SHALL return status code 400
9. WHEN a purchase request references a non-existent Launch, THE API SHALL return status code 404

### Requirement 18: View Purchases

**User Story:** As a user, I want to view purchase records, so that I can track my investments or monitor my launch performance.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made to GET /api/launches/:id/purchases, THE API SHALL return status code 401
2. WHEN the Creator requests GET /api/launches/:id/purchases, THE API SHALL return status code 200 with all Purchase records for that Launch
3. WHEN an authenticated User who is not the Creator requests GET /api/launches/:id/purchases, THE API SHALL return status code 200 with only Purchase records where userId matches the authenticated User
4. FOR ALL Purchase objects returned, THE API SHALL include userId, walletAddress, amount, totalCost, txSignature, and id fields

### Requirement 19: Calculate Vesting Schedule

**User Story:** As a user, I want to view my vesting schedule, so that I can understand when my tokens become available.

#### Acceptance Criteria

1. WHEN a GET request to /api/launches/:id/vesting includes a walletAddress query parameter, THE API SHALL calculate and return vesting information with status code 200
2. WHEN calculating vesting, THE API SHALL compute totalPurchased as the sum of all Purchase amounts for that Wallet_Address
3. WHERE the Launch has a Vesting_Schedule, THE API SHALL compute tgeAmount as floor of totalPurchased multiplied by tgePercent divided by 100
4. WHERE the Launch has a Vesting_Schedule and current time is after the cliff period, THE API SHALL compute vestedAmount using linear vesting over vestingDays
5. WHERE the Launch has a Vesting_Schedule, THE API SHALL compute lockedAmount as totalPurchased minus vestedAmount
6. WHERE the Launch has a Vesting_Schedule, THE API SHALL compute claimableAmount based on vested tokens
7. WHERE the Launch has no Vesting_Schedule, THE API SHALL set claimableAmount equal to totalPurchased
8. WHEN a GET request to /api/launches/:id/vesting is missing the walletAddress query parameter, THE API SHALL return status code 400
9. WHEN a GET request to /api/launches/:id/vesting references a non-existent Launch, THE API SHALL return status code 404

### Requirement 20: Server Configuration

**User Story:** As a developer, I want the server to use standard configuration, so that I can deploy and test consistently.

#### Acceptance Criteria

1. THE API SHALL listen on port 3000
2. THE API SHALL read DATABASE_URL from environment variables for PostgreSQL connection
3. THE API SHALL read JWT_SECRET from environment variables for token signing

### Requirement 21: Database Schema Management

**User Story:** As a developer, I want automated database setup, so that I can quickly initialize the system.

#### Acceptance Criteria

1. WHEN the start command is executed, THE API SHALL run Prisma generate to create the client
2. WHEN the start command is executed, THE API SHALL run Prisma db push to synchronize the database schema
3. THE API SHALL use PostgreSQL with Prisma as the ORM

### Requirement 22: Password Security

**User Story:** As a system, I want to securely store passwords, so that user credentials are protected.

#### Acceptance Criteria

1. WHEN a User registers, THE API SHALL hash the password using bcryptjs before storing
2. WHEN a User logs in, THE API SHALL compare the provided password against the hashed password using bcryptjs
