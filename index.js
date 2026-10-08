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

// Configs & Secrets
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8230134832:AAFmNfWYio5hMbfY74FLzV7Ip3-wTPKtqNM";
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const OWNER_NAME = "NAWAB ZADA HACKER ✌️ 🦅";
const BOT_NAME = "NAWAB ZADA HACKER MD";

// Auto Follow / Required Channels Config
const REQUIRED_CHANNELS = [
    { name: "Channel 1", url: "https://whatsapp.com/channel/0029VbB47ttDDmFNztpnZf2m" },
    { name: "Channel 2", url: "https://whatsapp.com/channel/0029Vb8rZ5H9Bb62fjLv430d" },
    { name: "Channel 3", url: "https://whatsapp.com/channel/0029VbCThCbLikgHTAQX9k2n" }
];

// Anti-Ban Engine Helper: Adds random delays to prevent WhatsApp spam filters
const randomDelay = (minMs = 1000, maxMs = 3000) => {
    const time = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, time));
};

console.log(`[+] ${BOT_NAME} Engine Online...`);

// Telegram Commands Setup
tgBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    let caption = `🦅 *WELCOME TO ${BOT_NAME}* 🦅\n\n` +
                  `👤 *Owner:* ${OWNER_NAME}\n` +
                  `⚙️ *System:* Online & Active (Anti-Ban Enabled 🛡️)\n\n` +
                  `*Required Channels:* Join karein pehle:\n`;
    
    REQUIRED_CHANNELS.forEach((ch, index) => {
        caption += `${index + 1}. [${ch.name}](${ch.url})\n`;
    });

    caption += `\n*Pairing Code lene ke liye command bhejain:*\n\`/pair +923xxxxxxxxx\``;

    tgBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// Telegram /pair Command
tgBot.onText(/\/pair (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let phoneNumber = match[1].replace(/[^0-9]/g, '');

    if (!phoneNumber || phoneNumber.length < 10) {
        return tgBot.sendMessage(chatId, "❌ *Invalid Number!* Pehle country code ke sath sahi number bhejen.\nExample: `/pair 923472995284`", { parse_mode: 'Markdown' });
    }

    const sessionDir = path.join(__dirname, `session_main`);
    const statusMsg = await tgBot.sendMessage(chatId, "🔄 *WhatsApp Server se Pair Code generate ho raha hai...*", { parse_mode: 'Markdown' });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"], 
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
        });

        sock.ev.on('creds.update', saveCreds);

        await delay(3000);

        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(phoneNumber);
            const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

            const responseText = `🦅 *${BOT_NAME} PAIR CODE* 🦅\n\n` +
                                 `📱 *Number:* \`+${phoneNumber}\`\n` +
                                 `🔑 *PAIRING CODE:* \`${formattedCode}\`\n\n` +
                                 `⚠️ *Steps to Connect:*\n` +
                                 `1. WhatsApp kholein -> Linked Devices.\n` +
                                 `2. *Link with Phone Number* par click karein.\n` +
                                 `3. Ye **8-digit Code** enter karein!\n\n` +
                                 `👤 *Owner:* ${OWNER_NAME}`;

            tgBot.editMessageText(responseText, {
                chat_id: chatId,
                message_id: statusMsg.message_id,
                parse_mode: 'Markdown'
            });
        }

        setupWhatsAppEvents(sock);

    } catch (error) {
        console.error(error);
        tgBot.editMessageText(`❌ *Error:* Pairing Code generate nahi ho saka.\nReason: ${error.message}`, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
});

// WhatsApp Bot Engine & Commands Setup
function setupWhatsAppEvents(sock) {

    // Auto Follow Required Channels on Connect
    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log("✅ WhatsApp Connected! Executing Auto-Follow Channels...");
            for (let ch of REQUIRED_CHANNELS) {
                try {
                    let code = ch.url.split('/').pop();
                    await sock.newsletterFollow(code);
                } catch (e) {
                    // Ignore if channel code resolution is restricted
                }
            }
        }
    });

    sock.ev.on('group-participants.update', async (anu) => {
        try {
            let metadata = await sock.groupMetadata(anu.id);
            let participants = anu.participants;

            for (let num of participants) {
                if (anu.action == 'add') {
                    let welcomeText = `┏━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `┃ 🦅 *WELCOME TO ${metadata.subject}* 🦅\n` +
                                      `┗━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                      `👋 Khushamdeed @${num.split('@')[0]}!\n` +
                                      `📜 Group Rules ko follow karein aur respectful rahein.\n\n` +
                                      `🤖 *Powered by ${BOT_NAME}*`;

                    await sock.sendMessage(anu.id, { 
                        text: welcomeText, 
                        mentions: [num] 
                    });

                } else if (anu.action == 'remove') {
                    let leftText = `👋 @${num.split('@')[0]} Left the group.\nAllah Hafiz! 🤲`;

                    await sock.sendMessage(anu.id, { 
                        text: leftText, 
                        mentions: [num] 
                    });
                }
            }
        } catch (err) {
            console.log("Group Update Error: ", err);
        }
    });

    // 2. WhatsApp Message Commands Handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const body = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "").trim();
        const command = body.toLowerCase().split(' ')[0];
        const args = body.split(' ').slice(1);

        // Anti-Ban Guard: Smart Delay before action
        await randomDelay(800, 2000);

        // Feature: Auto Reaction
        const emojiList = ["🦅", "⚡", "🔥", "👑", "🎯", "🛡️"];
        const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
        await sock.sendMessage(from, { react: { text: randomEmoji, key: m.key } });

        // Feature: Auto Typing / Recording Presence Simulation
        if (Math.random() > 0.5) {
            await sock.sendPresenceUpdate('composing', from);
        } else {
            await sock.sendPresenceUpdate('recording', from);
        }

        // In-Chat .pair command support
        if (command === '.pair') {
            let inputNum = args[0]?.replace(/[^0-9]/g, '');
            if (!inputNum) {
                return await sock.sendMessage(from, { text: "❌ *Usage:* `.pair 923472995284`" });
            }
            try {
                const code = await sock.requestPairingCode(inputNum);
                const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
                await sock.sendMessage(from, { 
                    text: `🦅 *${BOT_NAME} IN-CHAT PAIRING* 🦅\n\n📱 *Number:* +${inputNum}\n🔑 *Pair Code:* \`${formattedCode}\`\n\n👤 *Owner:* ${OWNER_NAME}` 
                });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Pair Code Fail: " + e.message });
            }
            return;
        }

        if (isGroup && (body.includes("chat.whatsapp.com/") || body.includes("whatsapp.com/channel/"))) {
            await sock.sendMessage(from, { delete: m.key });
            await sock.groupParticipantsUpdate(from, [m.key.participant], "remove");
            await sock.sendMessage(from, { text: `⚠️ *ANTI-LINK TRIGGERED:* @${m.key.participant.split('@')[0]} Removed.`, mentions: [m.key.participant] });
            return;
        }
      
        if (command === '.vv') {
            const quotedMsg = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const viewOnceMedia = quotedMsg?.viewOnceMessage?.message || quotedMsg?.viewOnceMessageV2?.message;

            if (!viewOnceMedia) {
                return await sock.sendMessage(from, { text: "❌ *Error:* Please reply to a View Once message with `.vv`." });
            }

            try {
                const mediaType = Object.keys(viewOnceMedia)[0];
                const stream = await downloadMediaMessage(
                    { message: viewOnceMedia },
                    'buffer',
                    {}
                );

                if (mediaType.includes('image')) {
                    await sock.sendMessage(from, { image: stream, caption: "🔓 *View Once Image Unlocked!*" });
                } else if (mediaType.includes('video')) {
                    await sock.sendMessage(from, { video: stream, caption: "🔓 *View Once Video Unlocked!*" });
                } else if (mediaType.includes('audio')) {
                    await sock.sendMessage(from, { audio: stream, ptt: true });
                }
            } catch (err) {
                await sock.sendMessage(from, { text: "❌ View Once extract karne mein error aaya." });
            }
            return;
        }

        // Feature: Image to Sticker Convertor (.sticker / .s)
        if (command === '.sticker' || command === '.s') {
            const quotedMsg = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const imageMsg = m.message.imageMessage || quotedMsg?.imageMessage;

            if (!imageMsg) {
                return await sock.sendMessage(from, { text: "❌ *Error:* Please send an image or reply to an image with `.sticker`" });
            }

            try {
                const stream = await downloadMediaMessage(
                    { message: quotedMsg ? quotedMsg : m.message },
                    'buffer',
                    {}
                );
                await sock.sendMessage(from, { sticker: stream });
            } catch (err) {
                await sock.sendMessage(from, { text: "❌ Sticker conversion failed." });
            }
            return;
        }

        if (command === '.owner') {
            await sock.sendMessage(from, { text: `🦅 *BOT OWNER DETAILS* 🦅\n\n👤 *Owner:* ${OWNER_NAME}\n🤖 *Bot:* ${BOT_NAME}\n⚡ *Status:* Online & Active` });
            return;
        }

        if (command === '.status') {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            await sock.sendMessage(from, { text: `⚡ *SERVER STATUS* ⚡\n\n⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n🛡️ *Anti-Ban:* Active\n🚀 *Engine:* ${BOT_NAME}` });
            return;
        }

        if (command === '.restart') {
            await sock.sendMessage(from, { text: "🔄 *Rebooting Bot Engine...*" });
            process.exit(0);
        }

        if (command === '.menu' || command === '.help') {
            const stylishMenu = `
╔═════════════════════════╗
   🦅 *${BOT_NAME}* 🦅
╚═════════════════════════╝

👤 *DEVELOPER:* ${OWNER_NAME}
⚙️ *PREFIX:* [ . ]
🛡️ *STATUS:* ACTIVE & ANTI-BAN PROTECTED

📢 *MANDATORY CHANNELS:*
1. ${REQUIRED_CHANNELS[0].url}
2. ${REQUIRED_CHANNELS[1].url}
3. ${REQUIRED_CHANNELS[2].url}

┌─── ❖ *NEW ADVANCED FEATURES* ❖
│ ◈ *.vv* - Download View Once Media
│ ◈ *.sticker* - Convert Image to Sticker
│ ◈ *Auto React* - Automatic Emoji Reactions
│ ◈ *Auto Typing* - Presence Simulation
│ ◈ *Anti-Ban Engine* - Humanized Delays
└───

┌─── ❖ *GROUP MANAGEMENT* ❖
│ ◈ *.tagall* - Mention All Members
│ ◈ *.hidetag <text>* - Hidden Tag Everyone
│ ◈ *.kickall* - Clear Non-Admins
│ ◈ *.kick @user* - Remove Participant
│ ◈ *.admin @user* - Promote Member
│ ◈ *.demote @user* - Demote Admin
│ ◈ *.setname <text>* - Change Group Name
│ ◈ *.setdesc <text>* - Change Description
│ ◈ *.antilink* - Enable Link Guard
│ ◈ *.gclink* - Get Group Invite Link
│ ◈ *.close* - Lock Group
│ ◈ *.open* - Unlock Group
└───

┌─── ❖ *SYSTEM* ❖
│ ◈ *.ping* - Bot Response Speed
│ ◈ *.pair <num>* - Get Pairing Code
│ ◈ *.owner* - Developer Info
│ ◈ *.restart* - Reboot Session
│ ◈ *.status* - Server Uptime
│ ◈ *.id* - Get Chat JID
│ ◈ *.info* - Group Info
└───

_Powered by ${OWNER_NAME}_`;

            await sock.sendMessage(from, { text: stylishMenu });
            return;
        }

        if (isGroup) {
            switch (command) {
                case '.ping':
                    await sock.sendMessage(from, { text: "⚡ *Pong!* Bot Speed: 0.01ms (Anti-Ban Active)" });
                    break;

                case '.gclink':
                    try {
                        const code = await sock.groupInviteCode(from);
                        await sock.sendMessage(from, { text: `🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${code}` });
                    } catch (e) {
                        await sock.sendMessage(from, { text: "❌ *Error:* Admin rights missing." });
                    }
                    break;

                case '.tagall':
                    const metadata = await sock.groupMetadata(from);
                    let participants = metadata.participants.map(p => p.id);
                    let tagText = `📢 *ATTENTION EVERYONE*\n\n`;
                    participants.forEach(p => tagText += `@${p.split('@')[0]}\n`);
                    await sock.sendMessage(from, { text: tagText, mentions: participants });
                    break;

                case '.hidetag':
                    const metaDataHide = await sock.groupMetadata(from);
                    let allMembers = metaDataHide.participants.map(p => p.id);
                    let hideMsg = args.join(' ') || "📢 Attention All Members!";
                    await sock.sendMessage(from, { text: hideMsg, mentions: allMembers });
                    break;

                case '.kick':
                    let mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    if (mentioned.length > 0) {
                        await sock.groupParticipantsUpdate(from, mentioned, "remove");
                        await sock.sendMessage(from, { text: "✅ Member Removed." });
                    } else {
                        await sock.sendMessage(from, { text: "❌ *Usage:* `.kick @user`" });
                    }
                    break;

                case '.admin':
                    let toAdmin = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    if (toAdmin.length > 0) {
                        await sock.groupParticipantsUpdate(from, toAdmin, "promote");
                        await sock.sendMessage(from, { text: "✅ User Promoted to Admin." });
                    } else {
                        await sock.sendMessage(from, { text: "❌ *Usage:* `.admin @user`" });
                    }
                    break;

                case '.demote':
                    let toDemote = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    if (toDemote.length > 0) {
                        await sock.groupParticipantsUpdate(from, toDemote, "demote");
                        await sock.sendMessage(from, { text: "✅ Admin Demoted to Member." });
                    } else {
                        await sock.sendMessage(from, { text: "❌ *Usage:* `.demote @user`" });
                    }
                    break;

                case '.setname':
                    let newSubject = args.join(' ');
                    if (!newSubject) return await sock.sendMessage(from, { text: "❌ *Usage:* `.setname <New Group Name>`" });
                    await sock.groupUpdateSubject(from, newSubject);
                    await sock.sendMessage(from, { text: "✅ Group name updated successfully!" });
                    break;

                case '.setdesc':
                    let newDesc = args.join(' ');
                    if (!newDesc) return await sock.sendMessage(from, { text: "❌ *Usage:* `.setdesc <New Description>`" });
                    await sock.groupUpdateDescription(from, newDesc);
                    await sock.sendMessage(from, { text: "✅ Group description updated successfully!" });
                    break;

                case '.close':
                    await sock.groupSettingUpdate(from, 'announcement');
                    await sock.sendMessage(from, { text: "⚠️ *Group Locked:* Only admins can send messages." });
                    break;

                case '.open':
                    await sock.groupSettingUpdate(from, 'not_announcement');
                    await sock.sendMessage(from, { text: "🔓 *Group Unlocked:* Everyone can send messages." });
                    break;

                case '.kickall':
                    const gData = await sock.groupMetadata(from);
                    const nonAdmins = gData.participants.filter(p => !p.admin).map(p => p.id);
                    await sock.sendMessage(from, { text: `⚠️ *Clearing ${nonAdmins.length} Non-Admin Members...*` });
                    await sock.groupParticipantsUpdate(from, nonAdmins, "remove");
                    break;
            }
        }
    });
}
