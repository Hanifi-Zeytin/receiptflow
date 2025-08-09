import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const createPrismaClient = () => {
  try {
    console.log("Creating Prisma client...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Set" : "Not set");
    
    const client = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    // Test the connection
    client.$connect()
      .then(() => {
        console.log("Database connection successful");
      })
      .catch((error) => {
        console.error("Database connection failed:", error);
      });
    
    return client;
  } catch (error) {
    console.error("Error creating Prisma client:", error);
    throw error;
  }
};

export const prisma: PrismaClient = global.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prismaGlobal = prisma;


