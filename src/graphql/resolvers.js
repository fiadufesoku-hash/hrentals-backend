import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prismaClient.js";
import { JWT_SECRET } from "../config/env.js";
import { v4 as uuidv4 } from "uuid";

// Commission fee for partner bookings
const COMMISSION_FEE = 5;

// Example placeholder for payment collection
async function collectPayment(phone, amount, transactionId, description) {
  // Implement actual MoMo payment logic here
  return true;
}

const resolvers = {
  Query: {
    me: (_, __, { user }) => user || null,

    users: async () => {
      return prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true },
      });
    },

properties: async (_, { type }, context) => {
  console.log("GraphQL Query received:", context.body?.query);
  const where = type ? { type } : {};
  return prisma.property.findMany({
    where,
    include: {
      owner: true,
      company: true,
      images: { orderBy: { order: "asc" } },
    },
  });
},


    property: async (_, { id }) => {
      return prisma.property.findUnique({
        where: { id },
        include: {
          owner: true,
          company: true,
          images: { orderBy: { order: "asc" } },
        },
      });
    },

    dashboardStats: async () => {
      const totalProperties = await prisma.property.count();
      const totalUsers = await prisma.user.count();
      const availableProperties = await prisma.property.count({
        where: { status: "available" },
      });
      const rentedProperties = await prisma.property.count({
        where: { status: "taken" },
      });
      return { totalProperties, totalUsers, availableProperties, rentedProperties };
    },

    myBookings: async (_, __, { user }) => {
      if (!user) throw new Error("Not authenticated");
      return prisma.booking.findMany({
        where: { userId: user.id },
        include: {
          property: { include: { owner: true } },
          company: true,
        },
      });
    },

    companies: async () => {
      return prisma.company.findMany({ include: { properties: true } });
    },

    company: async (_, { id }) => {
      return prisma.company.findUnique({ where: { id }, include: { properties: true } });
    },
  },

  Mutation: {
    register: async (_, { input }) => {
      const hashed = await bcrypt.hash(input.password, 10);
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashed,
          phone: input.phone,
        },
      });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
      return { token, user };
    },

    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error("Invalid credentials");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid credentials");

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
      return { token, user };
    },

    addProperty: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      const defaultCompany = await prisma.company.findFirst({ where: { isOwnCompany: true } });
      if (!defaultCompany) throw new Error("Default company not found");

      return prisma.property.create({
        data: {
          title: input.title,
          location: input.location,
          price: input.price,
          description: input.description,
          contact: input.contact,
          type: input.type,
          status: input.status || "available",
          imageUrl: input.imageUrl,
          ownerId: user.id,
          companyId: defaultCompany.id,
        images: {
       create: input.gallery?.map((img, index) => ({
    url: img.url.trim(),
    caption: img.caption,
    order: img.order || index,
  })) || [],
},

        },
        include: { owner: true, company: true, images: { orderBy: { order: "asc" } } },
      });
    },

    updateProperty: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) throw new Error("Property not found");
      if (property.ownerId !== user.id && user.role !== "admin") throw new Error("Not authorized");

      // Update basic property fields (excluding gallery)
      const { gallery, ...updateData } = input;
      await prisma.property.update({ where: { id }, data: updateData });

      // Update gallery images
      if (gallery) {
        await prisma.propertyImage.deleteMany({ where: { propertyId: id } });
        await prisma.propertyImage.createMany({
          data: gallery.map((img, index) => ({
            url: img.url,
            caption: img.caption,
            order: img.order || index,
            propertyId: id,
          })),
        });
      }

      return prisma.property.findUnique({
        where: { id },
        include: { owner: true, company: true, images: { orderBy: { order: "asc" } } },
      });
    },
deleteProperty: async (_, { id }, { user }) => {
  if (!user) throw new Error("Not authenticated");

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new Error("Property not found");
  if (property.ownerId !== user.id && user.role !== "admin") throw new Error("Not authorized");

  // Delete all gallery images first
  await prisma.propertyImage.deleteMany({ where: { propertyId: id } });

  // Then delete the property
  return prisma.property.delete({
    where: { id },
    include: { owner: true, company: true },
  });
},


    createBooking: async (_, { propertyId, startDate, endDate, totalAmount }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      if (!user.phone) throw new Error("User phone number required");

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) throw new Error("End date must be after start date");

      const overlapping = await prisma.booking.findFirst({
        where: {
          propertyId,
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
          status: { notIn: ["cancelled"] },
        },
      });
      if (overlapping) throw new Error("Property already booked");

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { company: true },
      });
      if (!property) throw new Error("Property not found");

      const companyId = property.companyId;
      const commissionAmount = property.company.isOwnCompany ? 0 : COMMISSION_FEE;
      const momoTxId = `tx_${uuidv4()}`;

      await collectPayment(user.phone, totalAmount, momoTxId, `Booking for ${property.title}`);

      return prisma.booking.create({
        data: {
          propertyId,
          userId: user.id,
          companyId,
          startDate: start,
          endDate: end,
          totalAmount,
          commissionAmount,
          momoTxId,
          status: "pending_payment",
        },
        include: {
          property: { include: { owner: true } },
          company: true,
        },
      });
    },

    createCompany: async (_, { name, logoUrl, contact, momoAccount }, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Admin only");
      return prisma.company.create({ data: { name, logoUrl, contact, momoAccount } });
    },

    createPartner: async (_, { input }, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Admin only");

      const hashed = await bcrypt.hash(input.password, 10);
      let companyId = input.companyId;

      if (!companyId) {
        const newCompany = await prisma.company.create({
          data: {
            name: input.companyName,
            logoUrl: input.logoUrl || "",
            contact: input.contact,
            momoAccount: input.momoAccount,
            isOwnCompany: false,
          },
        });
        companyId = newCompany.id;
      }

      const partner = await prisma.user.create({
        data: {
          name: input.userName,
          email: input.email,
          password: hashed,
          phone: input.phone,
          role: "partner",
          companyId,
        },
      });

      const token = jwt.sign({ id: partner.id }, JWT_SECRET, { expiresIn: "7d" });
      return { token, user: partner };
    },

    updatePropertyCompany: async (_, { id, companyId }) => {
      return prisma.property.update({
        where: { id },
        data: { companyId },
        include: { company: true },
      });
    },
  },

  // ✅ Property type resolvers - MAKE SURE THIS HAS COMMA AFTER Mutation
Property: {
  gallery: (parent) =>
    parent.images?.map(img => ({
      ...img,
      url: img.url.trim(), // <-- ADD THIS
    })) || [],
},

};

export default resolvers;