// Initialize prisma client for use in resolvers
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export default prisma;