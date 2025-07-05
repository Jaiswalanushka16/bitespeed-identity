# bitespeed-identity

#Tech Stack
- **Language**: Node.js with TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Framework**: Express
- **Testing Tool**: Bruno

#Features
- Accepts user contact info via `POST /identify`
- Checks for existing contacts with matching email or phone
- Links all related contacts under one primary identity
- Automatically handles:
  - Primary and secondary contact creation
  - Relationship linking via `linkedId`
  - Preventing duplicate entries
 
#API Endpoint
`POST /identify`

**Request Body** (any one of email or phoneNumber is required):
```json
{
  "email": "george@hillvalley.edu",
  "phoneNumber": "919191"
}
