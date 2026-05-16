import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");

export const bot = new Bot(token);

bot.command("start", (ctx) => ctx.reply("Kindred bot is running."));
bot.command("help", (ctx) =>
  ctx.reply(
    "/who <name> — relationship summary\n/upcoming — events in next 30 days\n/plan <name> — event plan\n/upgrade — get Kindred Pro",
  ),
);

bot.start();
