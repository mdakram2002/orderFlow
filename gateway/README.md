# API Gateway

Public REST edge for OrderFlow. It validates HS256 JWTs issued by User Service, enforces CUSTOMER/ADMIN authorization, applies separate Redis-backed authentication and general rate limits, validates incoming payloads, generates/propagates request IDs, and maps downstream errors to structured JSON responses.

