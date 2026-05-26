
import { prisma } from "db";
import { jwt } from "@elysiajs/jwt"

export abstract class AuthService {
    static async signup(email: string, password: string): Promise<string> {
        const user = await prisma.user.create({
            data: {
                email,
                password: await Bun.password.hash(password),
                // ── Seed Grant ───────────────────────────────────────────────
                // Every new account receives a $0.10 complimentary grant so
                // users can immediately test the Drop-In API without any billing
                // setup. The gateway enforces a hard 402 block once this is zero.
                walletBalance: 0.10,
            }
        })
        return user.id.toString();
    }

    static async signin(email: string, password: string): Promise<{ correctCredentials: boolean, userId?: string }> {
        const user = await prisma.user.findFirst({
            where: {
                email
            }
        })

        if (!user) {
            return { correctCredentials: false };
        }

        if (!await Bun.password.verify(password, user.password)) return { correctCredentials: false };

        return { correctCredentials: true, userId: user.id.toString() };
    }
    static async getUserDetails(id: number) {
        return prisma.user.findFirst({
            where: {
                id
            },
            select: {
                walletBalance: true
            }
        })
    }
}