# Spec: Customer Management Module (REQ-101 to REQ-104)

## Objective
Build a Customers module for BIETMI ERP enabling CRUD operations on customer data with role-based access control (admin + commercial only). Customers can have multiple contact persons and linked invoices/contracts (empty for now, structure ready).

## Success Criteria

### REQ-101: Create Customer
- POST /api/v1/customers creates a new customer
- Fields: name, commercialRegister (optional), nif (optional), address (optional)
- Support multiple contacts per customer (name, phone, email, position)
- Return full customer object with contacts

### REQ-102: Update & Delete Customer
- PATCH /api/v1/customers/:id updates customer data
- DELETE /api/v1/customers/:id soft-deletes (sets isActive=false)
- 409 Conflict if customer has linked invoices (infrastructure ready)

### REQ-103: List Customers
- GET /api/v1/customers with search (name, nif) and sort
- Paginated response

### REQ-104: Customer Detail View
- GET /api/v1/customers/:id returns customer with contacts
- Include empty arrays for invoices/contracts (structure ready)

### Access Control
- Roles: admin, commercial only (no purchasing, no accountant)
- All endpoints protected by AuthGuard + RolesGuard

### Testing
- Unit tests for service methods
- Integration tests for API endpoints
- All tests follow TDD: Red → Green → Refactor
