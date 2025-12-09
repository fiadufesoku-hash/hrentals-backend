s:

Node.js with Express for the server.
GraphQL (via Apollo Server) for the API – a flexible way to query data (no fixed REST endpoints).
Prisma for MySQL database management (defines models like User, Company, Property, Booking).
JWT for authentication.
Axios for MoMo API calls (sandbox for testing payments).


Node.js (v18+ recommended; you're using v22.20.0).
MySQL database (local or cloud like Render/PlanetScale).
MTN MoMo developer account (free sandbox at momodeveloper.mtn.com) for payment testing.
Tools: npm, Postman/Thunder Client for testing API.

Installation

Clone the repo (or copy the files).
Navigate to the project root: cd ho-rentals-backend (adjust path).
Install dependencies:
textnpm install

Set up Prisma:
textnpx prisma generate
npx prisma migrate dev --name init
This creates database tables.

Environment Variables (.env file)
Create a .env file in the root with these (update values):
textDATABASE_URL=mysql://root@localhost:3306/horentals_db  # MySQL connection string
JWT_SECRET=your-strong-secret-key  # Generate with crypto (e.g., node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
PORT=4000  # Local server port
MOMO_SUBSCRIPTION_KEY=your-mtn-momo-sandbox-key  # From MTN developer portal
MOMO_CALLBACK_HOST=http://localhost:4000/momo  # Your server URL for callbacks (update for production)
MOMO_ENV=sandbox  # 'sandbox' for testing; change to 'production' later

Get MoMo key: Sign up at MTN portal, subscribe to "Collections" and "Disbursements", copy Primary Key.

Running the Server

Start locally:
npm start  # Or node src/server.js

With auto-reload: npm install -g nodemon then nodemon src/server.js.


Access GraphQL: http://localhost:4000/graphql (Apollo Playground for testing queries/mutations).
Health check: http://localhost:4000/health (returns "OK").

Seeding the Database
Run the seed script to create default company and admin:
node prisma/seed.js

Default admin: email "admin@horentals.com", password "024admin123" (change after login).

GraphQL Basics for Flutter
GraphQL is like a customizable API: Your Flutter app sends queries/mutations to one endpoint (/graphql) and gets exactly the data needed (no over-fetching like REST).

Queries: Read data (e.g., get properties).
Mutations: Write data (e.g., register user, create booking).
Authentication: Send JWT token in headers: Authorization: Bearer <token>.
Flutter Integration: Use graphql_flutter package.

Install: flutter pub add graphql_flutter.
Example Client Setup:
dartimport 'package:graphql_flutter/graphql_flutter.dart';

final HttpLink httpLink = HttpLink('http://localhost:4000/graphql');  // Update to production URL

final AuthLink authLink = AuthLink(getToken: () async => 'Bearer $yourJwtToken');  // Get from storage after login

final Link link = authLink.concat(httpLink);

ValueNotifier<GraphQLClient> initializeClient() {
  return ValueNotifier(
    GraphQLClient(
      link: link,
      cache: GraphQLCache(store: InMemoryStore()),
    ),
  );
}

// Wrap your app with GraphQLProvider(client: initializeClient())

Example Query in Flutter:
dartconst String getProperties = r'''
  query {
    properties {
      id
      title
      price
      company {
        name
        logoUrl
      }
    }
  }
''';

QueryResult result = await client.query(QueryOptions(document: gql(getProperties)));
if (result.hasException) print(result.exception.toString());
else print(result.data);




Authentication

Register/Login: Get a JWT token.
Use token in headers for protected mutations (e.g., addProperty, createBooking).
Token expires in 7 days (adjust in code if needed).

API Endpoints (Queries and Mutations)
All at /graphql. Use Playground or Flutter to test.
Queries

me: Get current user (requires auth).
Example:
graphqlquery {
  me {
    id
    name
    email
    role
    phone
  }
}

properties: List all properties.
Example:
graphqlquery {
  properties {
    id
    title
    price
    description
    imageUrl
    company {
      name
      logoUrl
    }
  }
}

property(id: Int!): Get one property.
Example:
graphqlquery {
  property(id: 1) {
    title
    price
    company { logoUrl }
  }
}

myBookings: User's bookings (requires auth).
Example:
graphqlquery {
  myBookings {
    id
    startDate
    endDate
    totalAmount
    status
    commissionAmount
  }
}

companies: List companies (admin view).
Example:
graphqlquery {
  companies {
    id
    name
    logoUrl
  }
}

company(id: Int!): Get one company.
Example:
graphqlquery {
  company(id: 1) {
    name
    logoUrl
  }
}


Mutations

register(input: RegisterInput!): Create user (role "user").
Input: { name, email, password, phone }
Example:
graphqlmutation {
  register(input: { name: "User", email: "user@example.com", password: "pass123", phone: "0241234567" }) {
    token
    user { id name }
  }
}

login(email, password): Get token.
Example:
graphqlmutation {
  login(email: "user@example.com", password: "pass123") {
    token
  }
}

addProperty(input: PropertyInput!): Add property (requires auth, company-assigned user).
Input: { title, location, price, description, imageUrl }
Example:
graphqlmutation {
  addProperty(input: { title: "Villa", location: "Accra", price: 150.0 }) {
    id
    title
  }
}

createBooking(propertyId, startDate, endDate, totalAmount): Book property (requires auth, initiates MoMo).
Example:
graphqlmutation {
  createBooking(propertyId: 1, startDate: "2025-11-10T00:00:00Z", endDate: "2025-11-15T00:00:00Z", totalAmount: 500.0) {
    id
    status
    momoTxId
  }
}

createCompany(input: CompanyInput!): Create company (admin only).
Input: { name, logoUrl, contact, momoAccount }
Example:
graphqlmutation {
  createCompany(input: { name: "Partner Co", contact: "partner@co.com", momoAccount: "0249876543" }) {
    id
    name
  }
}

updatePropertyCompany(id, companyId): Assign company to property (auth required).
Example:
graphqlmutation {
  updatePropertyCompany(id: 1, companyId: 2) {
    id
    company { name }
  }
}

createPartner(input: PartnerInput!): Admin creates partner (role 'partner').
Input: { userName, email, password, phone, companyId (optional), companyName, logoUrl, contact, momoAccount }
Example:
graphqlmutation {
  createPartner(input: { userName: "Partner", email: "partner@ex.com", password: "pass123", companyName: "New Co", logoUrl: "url", contact: "contact", momoAccount: "024..." }) {
    token
    user { role }
  }
}


MoMo Payments Flow

On createBooking: Initiates MoMo collection (prompt on user's phone).
Status 'pending_payment' until callback.
Callback (/momo/collection/callback): Updates to 'paid', disburses to partner if commission applies.
Simulate in testing: POST to callback with { externalId: momoTxId, resultCode: 0, amount: ... }.

Flutter Tips

Use graphql_flutter for queries/mutations.
Store JWT in secure storage (e.g., flutter_secure_storage).
For MoMo: After mutation, poll booking status or use subscriptions (add later).
Handle errors (e.g., auth failures).

Troubleshooting

Errors: Check console/logs.
Prisma: Run npx prisma studio for DB view.
MoMo: Use sandbox; check MTN portal for keys.
Contact: If stuck, ask the backend dev.
