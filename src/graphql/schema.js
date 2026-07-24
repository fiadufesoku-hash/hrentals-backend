export const typeDefs = `
    scalar DateTime

    ##########################
    # OBJECT TYPES
    ##########################

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

    """Statistics returned for the admin dashboard."""
    type DashboardStats {
        totalProperties: Int!
        totalUsers: Int!
        availableProperties: Int!
        rentedProperties: Int!
        totalPageVisits: Int!
        todayPageVisits: Int!
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
        isFeatured: Boolean!
        gallery: [PropertyImage!]!
        createdAt: String
        owner: User
        company: Company
    }

    type Report {
        id: Int!
        propertyId: Int!
        reason: String!
        details: String
        status: String!
        createdAt: String!
        property: Property
        reporter: User
    }

    type ContactLog {
        id: Int!
        customerName: String!
        customerPhone: String!
        actionType: String!
        landlordPhone: String!
        createdAt: String!
        property: Property
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
        momoTxId: String
    }

    type AuthPayload {
        token: String!
        user: User!
    }

    ##########################
    # INPUT TYPES
    ##########################

    input RegisterInput {
        name: String!
        email: String!
        password: String!
        phone: String
    }

    input PropertyImageInput {
        url: String!
        caption: String
        order: Int
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
        isFeatured: Boolean
        gallery: [PropertyImageInput!]
    }

    input PartnerInput {
        userName: String!
        email: String!
        password: String!
        phone: String
        companyId: Int
        companyName: String
        logoUrl: String
        contact: String
        momoAccount: String
    }

    ##########################
    # QUERIES
    ##########################
    type Query {
        me: User
        users: [User!]!
        properties(type: String): [Property!]!
        property(id: Int!): Property
        myBookings: [Booking!]!
        companies: [Company!]!
        company(id: Int!): Company
        dashboardStats: DashboardStats!
        contactLogs: [ContactLog!]!
        reports: [Report!]!
    }

    type PasswordResetPayload {
        success: Boolean!
        message: String!
        otpCode: String
    }

    ##########################
    # MUTATIONS
    ##########################
    type Mutation {
        register(input: RegisterInput!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        requestPasswordReset(identifier: String!): PasswordResetPayload!
        resetPasswordWithOtp(identifier: String!, otpCode: String!, newPassword: String!): PasswordResetPayload!
        addProperty(input: PropertyInput!): Property!
        updateProperty(id: Int!, input: PropertyInput!): Property!
        updatePropertyStatus(id: Int!, status: String!): Property!
        togglePropertyFeatured(id: Int!): Property!
        deleteProperty(id: Int!): Property!
        createBooking(propertyId: Int!, startDate: DateTime!, endDate: DateTime!, totalAmount: Float!): Booking!
        createCompany(name: String!, logoUrl: String, contact: String!, momoAccount: String): Company!
        createPartner(input: PartnerInput!): AuthPayload!
        updatePropertyCompany(id: Int!, companyId: Int!): Property!
        deleteUser(id: Int!): User!
        updateUserRole(id: Int!, role: String!): User!
        createContactLog(customerName: String!, customerPhone: String!, actionType: String!, propertyId: Int!, landlordPhone: String!): ContactLog!
        createReport(propertyId: Int!, reason: String!, details: String): Report!
        updateReportStatus(id: Int!, status: String!): Report!
        deleteReport(id: Int!): Report!
        recordPageVisit(path: String!): Boolean!
    }
`;

