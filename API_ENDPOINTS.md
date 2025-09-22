# Resource Allocation API Endpoints

## Allocations

### GET /api/allocations
Get all allocations with optional filters.

**Query Parameters:**
- `resourceId` - Filter by resource ID
- `projectId` - Filter by project ID  
- `workTypeId` - Filter by work type ID
- `weekStart` - Filter by week start date (ISO format)
- `weekEnd` - Filter by week end date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "resourceId": "string",
      "projectId": "string | null",
      "workTypeId": "string",
      "weekStart": "2025-01-01T00:00:00.000Z",
      "days": 5,
      "notes": "string | null",
      "resource": {
        "id": "string",
        "name": "string",
        "role": "string"
      },
      "project": {
        "id": "string",
        "name": "string",
        "customer": "string"
      },
      "workType": {
        "id": "string",
        "name": "string",
        "color": "string"
      }
    }
  ],
  "count": 100
}
```

### POST /api/allocations
Create a new allocation.

**Request Body:**
```json
{
  "resourceId": "string",
  "projectId": "string | null",
  "workTypeId": "string", 
  "weekStart": "2025-01-01",
  "days": 5,
  "notes": "string"
}
```

### PATCH /api/allocations/[id]
Update an allocation by ID.

**Request Body:** (all fields optional)
```json
{
  "resourceId": "string",
  "projectId": "string | null",
  "workTypeId": "string",
  "weekStart": "2025-01-01", 
  "days": 5,
  "notes": "string"
}
```

### DELETE /api/allocations/[id]
Delete an allocation by ID.

## Resources

### GET /api/resources
Get all resources.

**Query Parameters:**
- `isActive` - Filter by active status (true/false)

### POST /api/resources
Create a new resource.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "role": "string"
}
```

## Projects

### GET /api/projects
Get all projects.

**Query Parameters:**
- `isActive` - Filter by active status (true/false)
- `customer` - Filter by customer name (partial match)

### POST /api/projects
Create a new project.

**Request Body:**
```json
{
  "name": "string",
  "customer": "string",
  "description": "string",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

## Work Types

### GET /api/work-types
Get all work types.

**Query Parameters:**
- `isActive` - Filter by active status (true/false)

### POST /api/work-types
Create a new work type.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "color": "string"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate entries)
- `500` - Internal Server Error

## Usage Examples

### Get allocations for a specific resource
```
GET /api/allocations?resourceId=cmcm5fesq002y8oriz1t028it
```

### Get allocations for a date range
```
GET /api/allocations?weekStart=2025-01-01&weekEnd=2025-01-31
```

### Create a new allocation
```javascript
const response = await fetch('/api/allocations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resourceId: 'cmcm5fesq002y8oriz1t028it',
    workTypeId: 'cmcm5fere00018oricz541b8i',
    weekStart: '2025-01-06',
    days: 3.5
  })
});
```

### Update an allocation
```javascript
const response = await fetch('/api/allocations/cmcm5fesq002y8oriz1t028it', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    days: 4
  })
});
``` 