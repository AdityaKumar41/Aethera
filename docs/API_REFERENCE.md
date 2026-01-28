# API Quick Reference Guide

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header unless marked as public.

---

## Yields API (`/api/yields`)

### Investor Endpoints

#### Get Yield Summary

```http
GET /api/yields/summary
Authorization: Bearer <token>
Role: INVESTOR

Response:
{
  "success": true,
  "data": {
    "totalClaimed": 1250.50,
    "totalPending": 340.75,
    "claimedCount": 5,
    "pendingCount": 2,
    "totalYield": 1591.25,
    "recentClaims": [...],
    "pendingClaims": [...]
  }
}
```

#### Get Yield History

```http
GET /api/yields/history
Authorization: Bearer <token>
Role: INVESTOR

Response:
{
  "success": true,
  "data": {
    "claims": [...],
    "totalClaimed": 1250.50,
    "totalPending": 340.75
  }
}
```

#### Get Pending Claims

```http
GET /api/yields/pending
Authorization: Bearer <token>
Role: INVESTOR

Response:
{
  "success": true,
  "data": {
    "claims": [...],
    "totalPending": 340.75,
    "count": 2
  }
}
```

#### Claim Single Yield

```http
POST /api/yields/claim/:claimId
Authorization: Bearer <token>
Role: INVESTOR

Response:
{
  "success": true,
  "message": "Yield claimed successfully",
  "data": { ... }
}
```

#### Batch Claim Yields

```http
POST /api/yields/claim/batch
Authorization: Bearer <token>
Role: INVESTOR
Content-Type: application/json

Body:
{
  "claimIds": ["claim_id_1", "claim_id_2", ...]
}

Response:
{
  "success": true,
  "message": "Successfully claimed 5 yields",
  "data": {
    "success": 5,
    "failed": 0,
    "errors": [],
    "totalAmount": 340.75,
    "txHash": "..."
  }
}
```

---

### Admin Endpoints

#### Create Yield Distribution

```http
POST /api/yields/distribute
Authorization: Bearer <token>
Role: ADMIN
Content-Type: application/json

Body:
{
  "projectId": "project_123",
  "periodStart": "2026-01-01T00:00:00Z",
  "periodEnd": "2026-01-31T23:59:59Z",
  "revenuePerKwh": 0.12,
  "platformFeePercent": 10,
  "notes": "January 2026 distribution"
}

Response:
{
  "success": true,
  "message": "Yield distribution created for 25 investors",
  "data": {
    "distributionId": "dist_123",
    "projectId": "project_123",
    "totalRevenue": 5000.00,
    "platformFee": 500.00,
    "totalYield": 4500.00,
    "investorCount": 25,
    "claimedCount": 0,
    "pendingCount": 25
  }
}
```

#### Get Distribution Summary

```http
GET /api/yields/distribution/:distributionId
Authorization: Bearer <token>
Role: ADMIN

Response:
{
  "success": true,
  "data": {
    "distributionId": "dist_123",
    "projectName": "SolarVille",
    "period": "2026-01-31T23:59:59Z",
    "totalRevenue": 5000.00,
    "platformFee": 500.00,
    "totalYield": 4500.00,
    "yieldPerToken": 0.045,
    "investorCount": 25,
    "claimedCount": 10,
    "pendingCount": 15,
    "claims": [...]
  }
}
```

#### Get Project Distributions

```http
GET /api/yields/project/:projectId
Authorization: Bearer <token>
Role: ADMIN | INSTALLER

Response:
{
  "success": true,
  "data": [
    {
      "id": "dist_123",
      "period": "2026-01-31T23:59:59Z",
      "totalRevenue": 5000.00,
      "totalYield": 4500.00,
      "distributed": true,
      "claimedCount": 10,
      "pendingCount": 15
    },
    ...
  ]
}
```

---

## Oracle API (`/api/oracle`)

### Record Production Data

```http
POST /api/oracle/production
Authorization: Bearer <token>
Role: ADMIN
Content-Type: application/json

Body:
{
  "projectId": "project_123",
  "energyProduced": 1250.5,
  "recordedAt": "2026-01-28T12:00:00Z",
  "source": "iot_sensor",
  "notes": "Automated reading from inverter"
}

Response:
{
  "success": true,
  "message": "Production data recorded",
  "data": {
    "id": "prod_123",
    "energyProduced": 1250.5,
    "recordedAt": "2026-01-28T12:00:00Z",
    "verifiedBy": "admin_user_id"
  }
}
```

### Bulk Production Import

```http
POST /api/oracle/production/bulk
Authorization: Bearer <token>
Role: ADMIN
Content-Type: application/json

Body:
{
  "projectId": "project_123",
  "records": [
    {
      "energyProduced": 1250.5,
      "recordedAt": "2026-01-01T12:00:00Z",
      "source": "iot_sensor"
    },
    ...
  ]
}

Response:
{
  "success": true,
  "message": "Bulk import completed",
  "data": {
    "imported": 30,
    "failed": 0,
    "errors": []
  }
}
```

### Get Production History

```http
GET /api/oracle/production/:projectId?limit=100&offset=0
Authorization: Bearer <token>
Role: ADMIN

Response:
{
  "success": true,
  "data": [
    {
      "id": "prod_123",
      "energyProduced": 1250.5,
      "recordedAt": "2026-01-28T12:00:00Z",
      "source": "iot_sensor",
      "verifiedBy": "admin_user_id",
      "notes": "..."
    },
    ...
  ],
  "pagination": {
    "total": 350,
    "limit": 100,
    "offset": 0
  }
}
```

### Get Performance Metrics

```http
GET /api/oracle/performance/:projectId
Authorization: Bearer <token>
Role: ADMIN | INSTALLER

Response:
{
  "success": true,
  "data": {
    "projectId": "project_123",
    "totalEnergyProduced": 45000.5,
    "averageDailyProduction": 150.2,
    "performanceRatio": 0.85,
    "lastRecordedAt": "2026-01-28T12:00:00Z",
    "recordCount": 300
  }
}
```

### Calculate Yield

```http
POST /api/oracle/yield/:projectId/calculate
Authorization: Bearer <token>
Role: ADMIN
Content-Type: application/json

Body:
{
  "periodStart": "2026-01-01T00:00:00Z",
  "periodEnd": "2026-01-31T23:59:59Z",
  "revenuePerKwh": 0.12
}

Response:
{
  "success": true,
  "data": {
    "energyProduced": 4500.0,
    "revenueGenerated": 540.00,
    "platformFee": 54.00,
    "yieldAmount": 486.00,
    "periodStart": "2026-01-01T00:00:00Z",
    "periodEnd": "2026-01-31T23:59:59Z"
  }
}
```

---

## Stellar/Trustline API (`/api/stellar`)

### Check Trustline

```http
GET /api/stellar/trustline/check
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "hasTrustline": true,
    "balance": "1500.0000000",
    "publicKey": "GXXXXXXX..."
  }
}
```

### Create Trustline

```http
POST /api/stellar/trustline/create
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "USDC trustline created successfully",
  "data": {
    "txHash": "abc123..."
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:

- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Data Types

### YieldClaim

```typescript
{
  id: string;
  amount: number;          // USDC amount
  claimed: boolean;
  claimedAt?: string;      // ISO date
  txHash?: string;         // Stellar transaction hash
  distribution: {
    id: string;
    period: string;        // ISO date
    project: {
      name: string;
      location: string;
    }
  }
}
```

### ProductionData

```typescript
{
  id: string;
  energyProduced: number;  // kWh
  recordedAt: string;      // ISO date
  source: "manual" | "iot_sensor" | "inverter_api" | "utility_meter" | "third_party";
  verifiedBy: string;      // Admin user ID
  notes?: string;
}
```

### YieldDistribution

```typescript
{
  id: string;
  projectId: string;
  period: string;          // ISO date
  totalRevenue: number;    // USD
  platformFee: number;     // USD
  totalYield: number;      // USD
  yieldPerToken: number;   // USD per token
  distributed: boolean;
  distributedAt?: string;  // ISO date
  txHash?: string;
}
```

---

## Rate Limits

- Standard endpoints: 100 requests/minute
- Batch operations: 10 requests/minute
- Admin endpoints: 200 requests/minute

---

## Testing Endpoints

Use Postman, curl, or any HTTP client:

```bash
# Get yield summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/yields/summary

# Claim yield
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/yields/claim/claim_id_123

# Record production data (admin)
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"proj_123","energyProduced":1250.5,"recordedAt":"2026-01-28T12:00:00Z","source":"manual"}' \
  http://localhost:3001/api/oracle/production
```

---

**API Base URL:**

- Development: `http://localhost:3001/api`
- Production: `https://api.aethera.solar/api`

**Documentation Version:** 1.0  
**Last Updated:** January 28, 2026
