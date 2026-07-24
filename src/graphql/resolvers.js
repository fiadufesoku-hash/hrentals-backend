import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prismaClient.js";
import { JWT_SECRET } from "../config/env.js";
import { v4 as uuidv4 } from "uuid";

const COMMISSION_FEE = 5;

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

function requireAuth(user) {
  if (!user) throw new Error("You must be logged in to perform this action.");
}

function requireAdmin(user) {
  requireAuth(user);
  if (user.role !== "admin") throw new Error("Admin access required.");
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

const resolvers = {
  Query: {
    me: (_, __, { user }) => user || null,

    users: async (_, __, { user }) => {
      requireAdmin(user);
      return prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true },
      });
    },

    properties: async (_, { type }) => {
      const where = type ? { type } : {};
      const properties = await prisma.property.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          company: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" } },
        },
      });

      // Sort: featured first, then by newest
      properties.sort((a, b) => {
        if (a.isFeatured === b.isFeatured) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return a.isFeatured ? -1 : 1;
      });

      return properties;
    },

    property: async (_, { id }) => {
      return prisma.property.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          company: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" } },
        },
      });
    },

    dashboardStats: async (_, __, { user }) => {
      requireAdmin(user);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalProperties,
        totalUsers,
        availableProperties,
        rentedProperties,
        totalPageVisits,
        todayPageVisits,
      ] = await Promise.all([
        prisma.property.count(),
        prisma.user.count(),
        prisma.property.count({ where: { status: "available" } }),
        prisma.property.count({ where: { status: "rented" } }),
        prisma.pageVisit?.count?.() ?? 0,
        prisma.pageVisit?.count?.({ where: { createdAt: { gte: today } } }) ?? 0,
      ]);

      return {
        totalProperties,
        totalUsers,
        availableProperties,
        rentedProperties,
        totalPageVisits,
        todayPageVisits,
      };
    },

    myBookings: async (_, __, { user }) => {
      requireAuth(user);
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
      return prisma.company.findUnique({
        where: { id },
        include: { properties: true },
      });
    },

    contactLogs: async (_, __, { user }) => {
      requireAdmin(user);
      return prisma.contactLog.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          property: { select: { id: true, title: true, location: true } },
        },
      });
    },

    reports: async (_, __, { user }) => {
      requireAdmin(user);
      return prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          property: { select: { id: true, title: true, location: true, price: true, imageUrl: true } },
          reporter: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    },
  },

  Mutation: {
    createReport: async (_, { propertyId, reason, details }, { user }) => {
      return prisma.report.create({
        data: {
          propertyId,
          reason,
          details: details || null,
          reporterId: user ? user.id : null,
          status: "pending",
        },
        include: {
          property: { select: { id: true, title: true, location: true } },
          reporter: { select: { id: true, name: true, email: true } },
        },
      });
    },

    updateReportStatus: async (_, { id, status }, { user }) => {
      requireAdmin(user);
      const validStatuses = ["pending", "resolved", "dismissed"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
      }
      return prisma.report.update({
        where: { id },
        data: { status },
        include: {
          property: { select: { id: true, title: true, location: true } },
          reporter: { select: { id: true, name: true, email: true } },
        },
      });
    },

    deleteReport: async (_, { id }, { user }) => {
      requireAdmin(user);
      return prisma.report.delete({ where: { id } });
    },

    register: async (_, { input }) => {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw new Error("An account with this email already exists.");

      const hashed = await bcrypt.hash(input.password, 12);
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashed,
          phone: input.phone,
        },
      });

      return { token: signToken(user.id), user };
    },

    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      // Use constant-time comparison message to avoid user enumeration
      if (!user) throw new Error("Invalid email or password.");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid email or password.");

      return { token: signToken(user.id), user };
    },

    addProperty: async (_, { input }, { user }) => {
      requireAuth(user);

      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== "admin" && fullUser?.role !== "partner") {
        throw new Error("Only admins and partners can upload properties.");
      }

      const defaultCompany = await prisma.company.findFirst({
        where: { isOwnCompany: true },
      });
      if (!defaultCompany) throw new Error("Default company not configured. Contact an admin.");

      const { gallery, ...propertyData } = input;

      return prisma.property.create({
        data: {
          ...propertyData,
          status: propertyData.status || "available",
          ownerId: user.id,
          companyId: defaultCompany.id,
          images: {
            create: gallery?.map((img, index) => ({
              url: img.url.trim(),
              caption: img.caption || null,
              order: img.order ?? index,
            })) ?? [],
          },
        },
        include: {
          owner: true,
          company: true,
          images: { orderBy: { order: "asc" } },
        },
      });
    },

    updateProperty: async (_, { id, input }, { user }) => {
      requireAuth(user);

      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) throw new Error("Property not found.");

      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (property.ownerId !== user.id && fullUser?.role !== "admin") {
        throw new Error("You are not authorised to edit this property.");
      }

      const { gallery, ...updateData } = input;

      await prisma.property.update({ where: { id }, data: updateData });

      if (gallery !== undefined) {
        await prisma.propertyImage.deleteMany({ where: { propertyId: id } });
        if (gallery.length > 0) {
          await prisma.propertyImage.createMany({
            data: gallery.map((img, index) => ({
              url: img.url.trim(),
              caption: img.caption || null,
              order: img.order ?? index,
              propertyId: id,
            })),
          });
        }
      }

      return prisma.property.findUnique({
        where: { id },
        include: {
          owner: true,
          company: true,
          images: { orderBy: { order: "asc" } },
        },
      });
    },

    updatePropertyStatus: async (_, { id, status }, { user }) => {
      requireAuth(user);
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== "admin" && fullUser?.role !== "partner") {
        throw new Error("Not authorised to change property status.");
      }

      return prisma.property.update({
        where: { id },
        data: { status },
        include: { owner: true, company: true, images: { orderBy: { order: "asc" } } },
      });
    },

    togglePropertyFeatured: async (_, { id }, { user }) => {
      requireAdmin(user);

      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) throw new Error("Property not found.");

      return prisma.property.update({
        where: { id },
        data: { isFeatured: !property.isFeatured },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          company: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" } },
        },
      });
    },

    deleteProperty: async (_, { id }, { user }) => {
      requireAuth(user);

      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) throw new Error("Property not found.");

      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (property.ownerId !== user.id && fullUser?.role !== "admin") {
        throw new Error("You are not authorised to delete this property.");
      }

      // Delete gallery images before deleting the property (referential integrity)
      await prisma.propertyImage.deleteMany({ where: { propertyId: id } });

      return prisma.property.delete({ where: { id } });
    },

    createContactLog: async (_, { customerName, customerPhone, actionType, propertyId, landlordPhone }) => {
      return prisma.contactLog.create({
        data: { customerName, customerPhone, actionType, propertyId, landlordPhone },
        include: {
          property: { select: { id: true, title: true, location: true } },
        },
      });
    },

    recordPageVisit: async (_, { path }) => {
      try {
        await prisma.pageVisit.create({ data: { path } });
        return true;
      } catch {
        // Non-critical — don't throw, just swallow the error silently
        return false;
      }
    },

    createBooking: async (_, { propertyId, startDate, endDate, totalAmount }, { user }) => {
      requireAuth(user);

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) throw new Error("End date must be after start date.");

      const overlapping = await prisma.booking.findFirst({
        where: {
          propertyId,
          status: { notIn: ["cancelled"] },
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
        },
      });
      if (overlapping) throw new Error("This property is already booked for the selected dates.");

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { company: true },
      });
      if (!property) throw new Error("Property not found.");

      const commissionAmount = property.company.isOwnCompany ? 0 : COMMISSION_FEE;
      const momoTxId = `tx_${uuidv4()}`;

      return prisma.booking.create({
        data: {
          propertyId,
          userId: user.id,
          companyId: property.companyId,
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
      requireAdmin(user);
      return prisma.company.create({ data: { name, logoUrl, contact, momoAccount } });
    },

    createPartner: async (_, { input }, { user }) => {
      requireAdmin(user);

      const hashed = await bcrypt.hash(input.password, 12);
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

      return { token: signToken(partner.id), user: partner };
    },

    updatePropertyCompany: async (_, { id, companyId }, { user }) => {
      requireAdmin(user);
      return prisma.property.update({
        where: { id },
        data: { companyId },
        include: { company: true },
      });
    },

    deleteUser: async (_, { id }, { user }) => {
      requireAdmin(user);
      if (user.id === id) throw new Error("You cannot delete your own admin account.");
      return prisma.user.delete({ where: { id } });
    },

    updateUserRole: async (_, { id, role }, { user }) => {
      requireAdmin(user);
      const validRoles = ["admin", "partner", "user"];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
      }
      return prisma.user.update({ where: { id }, data: { role } });
    },
  },

  // ─── Field resolvers ──────────────────────────────────────────────────────

  Property: {
    // Map the Prisma `images` relation to the GraphQL `gallery` field
    gallery: (parent) =>
      parent.images?.map((img) => ({
        ...img,
        url: img.url.trim(),
      })) ?? [],
  },
};

export default resolvers;