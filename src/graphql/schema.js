export const typeDefs = `
    scalar DateTime
    scalar Upload

    type PropertyImage {
        id: Int!
        url: String!
        caption: String
        order: Int!
        propertyId: Int!
        createdAt: String!
    }

    type Company {
        id: Int!
        name: String!
        logoUrl: String
        contact: String!
        isOwnCompany: Boolean!
        properties: [Property!]!
    }

    type DashboardStats {
        totalProperties: Int!
        totalUsers: Int!
        availableProperties: Int!
    }

    type Query {
        me: user
        properties(type: String): [Property!]!
        dashboardStats: DashboardStats!
        property(id: Int!): Property
        companies: [Company!]!
        company(id: Int!): Company
        myBookings: [Booking!]!
        users: [user!]!
    }

    type user {                     # ← lowercase u
        id: Int!
        name: String!
        email: String!
        role: String!
        phone: String
    }

    type Property {
        id: ID!
        title: String!
        location: String!
        price: Float!
        description: String
        contact: String
        type: String
        status: String
        imageUrl: String
        gallery: [PropertyImage!]!
        createdAt: String
        user: user
        company: Company
    }

    input PropertyImageInput {
        url: String!
        caption: String
        order: Int!
    }

    type Booking {
        id: Int!
        startDate: DateTime!
        endDate: DateTime!
        totalAmount: Float!
        status: String!
        user: user!
        property: Property!
        company: Company!
        commissionAmount: Float!
    }

    type AuthPayload {
        token: String!
        user: user!
    }

    input RegisterInput {
        name: String!
        email: String!
        password: String!
        phone: String
    }

    input PropertyInput {
        title: String!
        location: String!
        price: Float!
        description: String
        contact: String
        type: String
        status: String
        imageUrl: String
        gallery: [PropertyImageInput!]
    }

    type Mutation {
        register(input: RegisterInput!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        addProperty(input: PropertyInput!): Property!
        updateProperty(id: Int!, input: PropertyInput!): Property!
        deleteProperty(id: Int!): Property!
        createBooking(propertyId: Int!, startDate: DateTime!, endDate: DateTime!, totalAmount: Float!): Booking!
        createCompany(name: String!, logoUrl: String, contact: String!, momoAccount: String): Company!
        createPartner(input: PartnerInput!): AuthPayload!
        updatePropertyCompany(id: Int!, companyId: Int!): Property!
    }
`;