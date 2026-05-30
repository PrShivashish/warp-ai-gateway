import { Elysia, t } from "elysia";
import { ConversationService } from "./service";
import jwt from "@elysiajs/jwt";

export const conversationApp = new Elysia({ prefix: "/conversations" })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || "fallback_secret_for_warp_gateway"
        })
    )
    .resolve(async ({ cookie: { auth }, status, jwt }) => {
        if (!auth) {
            return status(401);
        }

        const decoded = await jwt.verify(auth.value as string);

        if (!decoded || !decoded.userId) {
            return status(401);
        }

        return {
            userId: decoded.userId as string
        };
    })
    .get("/", async ({ userId }) => {
        return ConversationService.listConversations(Number(userId));
    })
    .get("/:id", async ({ set, params: { id }, userId }) => {
        const conversation = await ConversationService.getConversation(Number(userId), id);
        if (!conversation) {
            set.status = 404;
            return { message: "Not found" };
        }
        return conversation;
    })
    .post("/", async ({ body, userId }) => {
        return ConversationService.createConversation(Number(userId), body.title);
    }, {
        body: t.Object({
            title: t.Optional(t.String())
        })
    })
    .delete("/:id", async ({ params: { id }, userId }) => {
        await ConversationService.deleteConversation(Number(userId), id);
        return { success: true };
    })
    .patch("/:id/title", async ({ params: { id }, body, userId }) => {
        await ConversationService.updateTitle(Number(userId), id, body.title);
        return { success: true };
    }, {
        body: t.Object({
            title: t.String()
        })
    });
