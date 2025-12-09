// GraphQL API Structure
// Defines queries and mutations client can run and get back

// ✅ NO IMPORT NEEDED - use template literal
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
        me: User
        properties(type: String): [Property!]!
        dashboardStats: DashboardStats!
        property(id: Int!): Property
        companies: [Company!]!
        company(id: Int!): Company
        myBookings: [Booking!]!
        users: [User!]!
    }

    type User {
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
        user: User
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
        user: User!
        property: Property!
        company: Company!
        commissionAmount: Float!
    }

    type AuthPayload {
        token: String!
        user: User!
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

    input CompanyInput {
        name: String!
        logoUrl: String
        contact: String!
        momoAccount: String
    }

    input PartnerInput {
        userName: String!
        email: String!
        password: String!
        phone: String
        companyId: Int
        companyName: String
        logoUrl: String
        contact: String!
        momoAccount: String!
    }

    type Mutation {
        register(input: RegisterInput!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        addProperty(input: PropertyInput!): Property!
        updateProperty(id: Int!, input: PropertyInput!): Property!
        deleteProperty(id: Int!): Property!
        createBooking(propertyId: Int!, startDate: DateTime!, endDate: DateTime!, totalAmount: Float!): Booking!
        createCompany(input: CompanyInput!): Company!
        createPartner(input: PartnerInput!): AuthPayload!
        updatePropertyCompany(id: Int!, companyId: Int!): Property!
    }
`;