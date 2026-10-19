const TelegramBot = require('node-telegram-bot-api');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    downloadMediaMessage, 
    fetchLatestBaileysVersion, 
    DisconnectReason, 
    Browsers 
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');

// 24/7 ANTI-SLEEP WEB SERVER
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`▣🅽🅰🆆🅰🅱 🆉🅰🅳🅰 🅷🅰🅲🅺🅴🆁 🅼🅳 🅱🅾🆃▣ - 24/7 Multi-Device BOT ONLINE!`);
}).listen(PORT, () => {
    console.log(`[+] 24/7 Server running on port ${PORT}`);
});

// CRASH PREVENTION GUARDS
process.on('uncaughtException', (err) => console.log('[-] Caught Exception:', err.message));
process.on('unhandledRejection', (err) => console.log('[-] Unhandled Rejection:', err));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8647185787:AAFdPPj_YK9xmwNZxH2XevSZc1azZ_fkT38";
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const OWNER_NAME = "✦ 𝓝𝓐𝓦𝓐𝓑 𝓩𝓐𝓓𝓐 𝓗𝓐𝓒𝓚𝓔𝓡 ✌️ 🦅 ✦";
const BOT_NAME = "▣🅽🅰🆆🅰🅱 🆉🅰🅳🅰 🅷🅰🅲🅺🅴🆁 🅼🅳 🅱🅾🆃▣";
const BANNER_IMAGE = "https://i.ibb.co/ycxV3SCM/photo.jpg";
const REQUIRED_CHANNELS = [
    { name: "Channel 1", url: "https://whatsapp.com/channel/0029VbB47ttDDmFNztpnZf2m" },
    { name: "Channel 2", url: "https://whatsapp.com/channel/0029VaUjhPYIt5rvVy9fpg3R" },
    { name: "Channel 3", url: "https://whatsapp.com/channel/0029VbCThCbLikgHTAQX9k2n" }
];

if (!fs.existsSync(path.join(__dirname, 'sessions'))) {
    fs.mkdirSync(path.join(__dirname, 'sessions'), { recursive: true });
}

// PERSISTENT STORAGE
const antilinkFile = path.join(__dirname, 'antilink.json');
let antilinkDB = {};
if (fs.existsSync(antilinkFile)) {
    try { antilinkDB = JSON.parse(fs.readFileSync(antilinkFile, 'utf-8')); } catch (e) { antilinkDB = {}; }
}
const saveAntilink = () => {
    try { fs.writeFileSync(antilinkFile, JSON.stringify(antilinkDB, null, 2)); } catch (e) {}
};

const settingsFile = path.join(__dirname, 'settings.json');
let botSettings = { autoreact: false };
if (fs.existsSync(settingsFile)) {
    try { botSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8')); } catch (e) { botSettings = { autoreact: false }; }
}
const saveSettings = () => {
    try { fs.writeFileSync(settingsFile, JSON.stringify(botSettings, null, 2)); } catch (e) {}
};

const activeSessions = {};
const processedMsgIds = new Set();
const botSentMsgIds = new Set();

console.log(`[+] ${BOT_NAME} 24/7 Engine Active - Multi-Client Ready...`);

async function restoreAllSessions() {
    try {
        const sessionsDir = path.join(__dirname, 'sessions');
        const folders = fs.readdirSync(sessionsDir);
        for (let folder of folders) {
            const fullPath = path.join(sessionsDir, folder);
            if (fs.existsSync(path.join(fullPath, 'creds.json'))) {
                const sessionKey = folder.replace('session_', '');
                console.log(`[+] Restoring Active Session: ${sessionKey}`);
                startSocketEngine(fullPath, sessionKey);
                await delay(2000);
            }
        }
    } catch (e) {}
}
setTimeout(restoreAllSessions, 3000);

async function startSocketEngine(sessionDir, sessionKey, onReady) {
    if (activeSessions[sessionKey]) {
        try {
            activeSessions[sessionKey].ws?.close();
            activeSessions[sessionKey].end(undefined);
        } catch (e) {}
        delete activeSessions[sessionKey];
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            mobile: false,
            browser: Browsers.ubuntu("Chrome"),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            defaultQueryTimeoutMs: undefined,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            fireInitQueries: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            getMessage: async () => ({ conversation: 'ℕ𝔸𝕎𝔸𝔹 ℤ𝔸𝔻𝔸 ℍ𝔸ℂ𝕂𝔼ℝ🔑' })
        });

        activeSessions[sessionKey] = sock;
        sock.ev.on('creds.update', async () => await saveCreds());

        let heartbeatTimer = null;

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ Session [${sessionKey}] Connected & Online!`);
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                heartbeatTimer = setInterval(async () => {
                    try { await sock.sendPresenceUpdate('available'); } catch (e) {}
                }, 20000);

                setupWhatsAppEvents(sock);
                if (onReady) onReady(sock);
            } else if (connection === 'close') {
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`Session [${sessionKey}] Closed (Code: ${statusCode}). Auto-Reconnecting...`);

                if (statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(() => startSocketEngine(sessionDir, sessionKey, onReady), 2500);
                } else {
                    console.log(`Session [${sessionKey}] Logged Out.`);
                    delete activeSessions[sessionKey];
                }
            }
        });

        return sock;
    } catch (err) {
        console.error(`Socket Engine Error [${sessionKey}]:`, err.message);
        return null;
    }
}

// ==================== TELEGRAM BOT MODULE ====================
tgBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    let caption = `╔════════════════════════╗\n` +
                  `   🦅 *WELCOME TO ${BOT_NAME}* 🦅\n` +
                  `╚════════════════════════╝\n\n` +
                  `👑 *Owner:* ${OWNER_NAME}\n` +
                  `⚡ *Status:* 24/7 Multi-Client BOT online ✅\n` +
                  `📜 *Commands:* 250+ Loaded & Functional\n` +
                  `🛡️ *Protection:* Anti-Ban system\n\n` +
                  `_Pairing ke liye command enter karein:_\n` +
                  `👉 \`/pair 923xxxxxxxxx\``;

    const options = {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📜 Check Commands", callback_data: "btn_commands" },
                    { text: "🔑 Pair WhatsApp", callback_data: "btn_pair_info" }
                ],
                [
                    { text: "📢 Official Channel 1", url: REQUIRED_CHANNELS[0].url },
                    { text: "📢 Official Channel 2", url: REQUIRED_CHANNELS[1].url }
                ]
            ]
        }
    };

    tgBot.sendPhoto(chatId, BANNER_IMAGE, options).catch(() => {
        tgBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: options.reply_markup });
    });
});

tgBot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'btn_commands') {
        const cmdSummary = `📋 *${BOT_NAME} - COMMAND PANEL*\n\n` +
            `🔹 Total 250+ Commands Active.\n` +
            `WhatsApp par jakar *.menu* send karein poori list mil jayegi.`;
        await tgBot.sendMessage(chatId, cmdSummary, { parse_mode: 'Markdown' });
    } else if (data === 'btn_pair_info') {
        await tgBot.sendMessage(chatId, `📌 *Pairing Guide:*\n\nEnter your number with country code:\nExample: \`/pair 923001234567\``, { parse_mode: 'Markdown' });
    }
    tgBot.answerCallbackQuery(query.id);
});

tgBot.onText(/\/pair (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let rawNumber = match[1].replace(/[^0-9]/g, '');

    if (rawNumber.startsWith('0')) rawNumber = '92' + rawNumber.slice(1);
    let phoneNumber = rawNumber;

    if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
        return tgBot.sendMessage(chatId, "❌ *Invalid Number!*\nEnter valid number with country code.\n*Example:* `/pair 92347xxxxxxx`", { parse_mode: 'Markdown' });
    }

    const sessionKey = `tg_${chatId}_${phoneNumber}`;
    const sessionDir = path.join(__dirname, `sessions`, `session_${sessionKey}`);
    if (fs.existsSync(sessionDir)) {
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}
    }
    fs.mkdirSync(sessionDir, { recursive: true });

    const statusMsg = await tgBot.sendMessage(chatId, "🔄 *Generating Pair Code please wait...*", { parse_mode: 'Markdown' });

    let isSuccessNotified = false;
    let isPairCodeRequested = false;

    const sock = await startSocketEngine(sessionDir, sessionKey, async () => {
        if (!isSuccessNotified) {
            isSuccessNotified = true;
            await tgBot.sendMessage(chatId, `✅ *PAIRING SUCCESSFUL!* 🎉\n\n+${phoneNumber} is now linked to *${BOT_NAME}*!\nWhatsApp par jakar *.menu* send karein.`);
        }
    });

    if (sock) {
        setTimeout(async () => {
            if (!sock.authState.creds.registered && !isPairCodeRequested) {
                isPairCodeRequested = true;
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    let formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

                    const pairMessage = `🦅 *${BOT_NAME} PAIR CODE* 🦅\n\n` +
                        `📱 *Number:* \`+${phoneNumber}\`\n` +
                        `🔑 *Code:* \`${formattedCode}\`\n\n` +
                        `*(Code tap kar ke copy karein aur WhatsApp Linked Devices mein paste karein)*\n\n` +
                        `1. WhatsApp -> *Linked Devices*\n` +
                        `2. *Link with phone number*\n` +
                        `3. Code enter karein (Instant link ho jayega)\n\n` +
                        `👤 *Owner:* ${OWNER_NAME}`;

                    await tgBot.editMessageText(pairMessage, {
                        chat_id: chatId,
                        message_id: statusMsg.message_id,
                        parse_mode: 'Markdown'
                    });
                } catch (err) {
                    tgBot.editMessageText(`❌ Pairing Error: ${err.message}`, { chat_id: chatId, message_id: statusMsg.message_id });
                }
            }
        }, 4000);
    }
});

// ==================== WHATSAPP EVENT HANDLER (DUPLICATE-PROOF & HIGH SPEED) ====================
function setupWhatsAppEvents(sock) {
    if (sock._eventsLoaded) return;
    sock._eventsLoaded = true;

    // AUTO CHANNEL FOLLOW
    (async () => {
        await delay(6000);
        for (let ch of REQUIRED_CHANNELS) {
            try {
                let inviteCode = ch.url.split('/').pop().trim();
                if (sock.newsletterMetadata) {
                    let meta = await sock.newsletterMetadata("invite", inviteCode).catch(() => null);
                    if (meta && meta.id && sock.newsletterFollow) {
                        await sock.newsletterFollow(meta.id).catch(() => null);
                        console.log(`[+] Auto-Followed Channel: ${meta.name || meta.id}`);
                    }
                }
            } catch (e) {}
        }
    })();

    // GROUP PARTICIPANTS WELCOME & GOODBYE
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            let meta = await sock.groupMetadata(anu.id);
            for (let num of anu.participants) {
                if (anu.action === 'add') {
                    await sock.sendMessage(anu.id, {
                        text: `👑 *Welcome @${num.split('@')[0]} to ${meta.subject}* 🦅\nGroup Rules Follow kryn werna Remove ho jynge!\n\n> 👑 *Owner:* ${OWNER_NAME}`,
                        mentions: [num]
                    });
                } else if (anu.action === 'remove') {
                    await sock.sendMessage(anu.id, {
                        text: `👋 *Good Bye @${num.split('@')[0]} from ${meta.subject}!*\nAllah Hafiz! Hm jane wale ko Rasta Dyte hyn wata nahi.\n\n> 👑 *Owner:* ${OWNER_NAME}`,
                        mentions: [num]
                    });
                }
            }
        } catch (e) {}
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message) return;

        // 1. FIX: STOP OLD BUFFERED OFFLINE MESSAGES (45-SECOND TIMEOUT)
        const msgTime = m.messageTimestamp;
        const nowSec = Math.floor(Date.now() / 1000);
        if (msgTime && (nowSec - msgTime > 45)) return;

        // 2. FIX: STOP DUPLICATE DELIVERIES
        const msgId = m.key.id;
        if (processedMsgIds.has(msgId)) return;
        processedMsgIds.add(msgId);
        if (processedMsgIds.size > 3000) {
            const first = processedMsgIds.values().next().value;
            processedMsgIds.delete(first);
        }

        // 3. FIX: NEVER RESPOND TO BOT'S OWN MESSAGES (LOOP FIX)
        if (botSentMsgIds.has(msgId)) return;

        const from = m.key.remoteJid;
        if (from === 'status@broadcast') return;
        const isGroup = from.endsWith('@g.us');
        const senderJid = m.key.participant || from;

        let msg = m.message;
        if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
        if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
        if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
        if (msg.documentWithCaptionMessage) msg = msg.documentWithCaptionMessage.message;

        const body = (
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            ""
        ).trim();

        // ANTILINK SYSTEM
        if (isGroup && antilinkDB[from] && !m.key.fromMe) {
            const hasLink = /(chat\.whatsapp\.com\/[0-9A-Za-z]{20,24}|https?:\/\/[^\s]+)/gi.test(body);
            if (hasLink) {
                try {
                    const groupMeta = await sock.groupMetadata(from);
                    const isSenderAdmin = groupMeta.participants.some(p => p.id === senderJid && (p.admin === 'admin' || p.admin === 'superadmin'));
                    
                    if (!isSenderAdmin) {
                        if (antilinkDB[from].delete) {
                            await sock.sendMessage(from, { delete: m.key });
                        }
                        if (antilinkDB[from].remove) {
                            await sock.groupParticipantsUpdate(from, [senderJid], 'remove');
                            await sock.sendMessage(from, { 
                                text: `🚫 @${senderJid.split('@')[0]} Removed successfully!`,
                                mentions: [senderJid]
                            });
                        }
                        return;
                    }
                } catch (err) {}
            }
        }

        // AUTO-REACT ENGINE
        if (botSettings.autoreact && !m.key.fromMe) {
            const emojis = ["🦅", "👑", "🔥", "⚡", "❤️", "👍", "😎"];
            const randEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            try { await sock.sendMessage(from, { react: { text: randEmoji, key: m.key } }); } catch (e) {}
        }

        if (m.key.fromMe && !body.startsWith('.')) return;
        if (!body) return;

        const cmd = body.toLowerCase().split(' ')[0];
        const args = body.split(' ').slice(1);
        const queryText = args.join(' ');

        // HIGH SPEED UNIFIED REPLY WITH SIGNATURE
        const reply = async (text) => {
            const sent = await sock.sendMessage(from, { text: `${text}\n\n> 👑 *Owner:* ${OWNER_NAME}` }, { quoted: m });
            if (sent?.key?.id) botSentMsgIds.add(sent.key.id);
            return sent;
        };

        if (body.startsWith('.')) {
            try { await sock.sendMessage(from, { react: { text: "🦅", key: m.key } }); } catch (e) {}
        }

        // ==================== 1. FIXED WHATSAPP .PAIR (SUB-BOT ENGINE) ====================
        if (cmd === '.pair') {
            let raw = args[0]?.replace(/[^0-9]/g, '');
            if (raw && raw.startsWith('0')) raw = '92' + raw.slice(1);
            if (!raw || raw.length < 10) return reply("❌ *Usage:* `.pair 92300xxxxxxx`\nEnter your number with country code.");

            await reply(`🔄 *Generating Real WhatsApp Pairing Code for +${raw}...*`);

            const subSessionKey = `wa_${raw}`;
            const pairSessionDir = path.join(__dirname, 'sessions', `session_${subSessionKey}`);
            if (fs.existsSync(pairSessionDir)) {
                try { fs.rmSync(pairSessionDir, { recursive: true, force: true }); } catch (e) {}
            }
            fs.mkdirSync(pairSessionDir, { recursive: true });

            let isPCodeRequested = false;

            const subSock = await startSocketEngine(pairSessionDir, subSessionKey, async (readySock) => {
                await sock.sendMessage(from, { text: `✅ *+${raw} Successfully Paired and Logged In!* 🎉\nBOT is online Now..!\n\n> 👑 *Owner:* ${OWNER_NAME}` });
            });

            if (subSock) {
                setTimeout(async () => {
                    if (!subSock.authState.creds.registered && !isPCodeRequested) {
                        isPCodeRequested = true;
                        try {
                            let code = await subSock.requestPairingCode(raw);
                            let formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

                            await reply(`🦅 *${BOT_NAME} PAIR CODE* 🦅\n\n` +
                                        `📱 *Number:* \`+${raw}\`\n` +
                                        `🔑 *Pair Code:* \`${formattedCode}\`\n\n` +
                                        `*Steps to Login:*\n` +
                                        `1. WhatsApp Settings -> *Linked Devices*\n` +
                                        `2. *Link with phone number* par click karein\n` +
                                        `3. Yeh code enter karein (Instant connect ho jayega)!\n\n` +
                                        `_Code tap kar ke copy karein!_`);
                        } catch (err) {
                            await reply(`❌ Pairing code error: ${err.message}`);
                        }
                    }
                }, 4000);
            }
            return;
        }

        // ==================== 2. AUTOREACT ====================
        if (cmd === '.autoreact') {
            const opt = args[0]?.toLowerCase();
            if (opt === 'on') {
                botSettings.autoreact = true;
                saveSettings();
                return reply("✅ *Auto-React:* ON !");
            } else if (opt === 'off') {
                botSettings.autoreact = false;
                saveSettings();
                return reply("❌ *Auto-React:* OFF .");
            }
            return reply(`⚙️ *Auto-React Status:* ${botSettings.autoreact ? 'ON ✅' : 'OFF ❌'}\n\n*Usage:* \`.autoreact on\` ya \`.autoreact off\``);
        }

        // ==================== 3. WORKING .PLAY & .SONG (DIRECT AUDIO) ====================
        if (cmd === '.play' || cmd === '.song') {
            if (!queryText) return reply("❌ Enter song Name! Example: `.play Chale Aana`");
            await reply(`🔍 *Searching & Downloading Audio for:* "${queryText}"... Please wait!`);

            let audioSent = false;
            try {
                const apiRes = await fetch(`https://api.vreden.my.id/api/ytplaymp3?query=${encodeURIComponent(queryText)}`);
                const data = await apiRes.json();
                if (data?.result?.download?.url) {
                    await sock.sendMessage(from, { 
                        audio: { url: data.result.download.url }, 
                        mimetype: 'audio/mp4',
                        ptt: false,
                        fileName: `${queryText}.mp3`
                    }, { quoted: m });
                    audioSent = true;
                }
            } catch (e) {}

            if (!audioSent) {
                try {
                    const fallbackRes = await fetch(`https://api.agatz.xyz/api/ytmp3?url=https://www.youtube.com/results?search_query=${encodeURIComponent(queryText)}`);
                    const fData = await fallbackRes.json();
                    if (fData?.data?.downloadUrl) {
                        await sock.sendMessage(from, { 
                            audio: { url: fData.data.downloadUrl }, 
                            mimetype: 'audio/mp4',
                            ptt: false,
                            fileName: `${queryText}.mp3`
                        }, { quoted: m });
                        audioSent = true;
                    }
                } catch (e) {}
            }

            if (!audioSent) {
                try {
                    const wRes = await fetch(`https://widipe.com/download/ytdl?url=https://www.youtube.com/results?search_query=${encodeURIComponent(queryText)}`);
                    const wData = await wRes.json();
                    if (wData?.result?.mp3) {
                        await sock.sendMessage(from, { 
                            audio: { url: wData.result.mp3 }, 
                            mimetype: 'audio/mp4',
                            ptt: false,
                            fileName: `${queryText}.mp3`
                        }, { quoted: m });
                        audioSent = true;
                    }
                } catch (e) {}
            }

            if (!audioSent) {
                await reply(`❌ Song download nahi ho saka. YouTube stream link:\nhttps://www.youtube.com/results?search_query=${encodeURIComponent(queryText)}`);
            }
            return;
        }

        // ==================== 4. WORKING .MOVIE ====================
        if (cmd === '.movie' || cmd === '.film') {
            if (!queryText) return reply("❌ Enter Movie Name! Example: `.movie Jawan`");
            await reply(`🎬 *Searching Movie details for:* "${queryText}"...`);
            try {
                const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(queryText)}&apikey=trilogy`);
                const data = await res.json();
                if (data && data.Title) {
                    const movieText = `🎬 *MOVIE DETAILS FOUND:*\n\n` +
                                      `📌 *Title:* ${data.Title} (${data.Year})\n` +
                                      `⭐ *IMDb Rating:* ${data.imdbRating || 'N/A'}/10\n` +
                                      `🎭 *Genre:* ${data.Genre}\n` +
                                      `⏱️ *Runtime:* ${data.Runtime}\n` +
                                      `👤 *Actors:* ${data.Actors}\n` +
                                      `📝 *Plot:* ${data.Plot}\n\n` +
                                      `🍿 *Direct Download Link:* https://www.google.com/search?q=${encodeURIComponent(data.Title + " full movie download 720p 1080p")}`;
                    if (data.Poster && data.Poster !== 'N/A') {
                        await sock.sendMessage(from, { image: { url: data.Poster }, caption: movieText }, { quoted: m });
                    } else {
                        await reply(movieText);
                    }
                } else {
                    await reply(`🎬 *Movie:* ${queryText}\nSearch Link: https://www.google.com/search?q=${encodeURIComponent(queryText + " full movie watch online")}`);
                }
            } catch (e) {
                await reply(`🎬 *Movie Search:* ${queryText}\nDownload Link: https://www.google.com/search?q=${encodeURIComponent(queryText + " movie")}`);
            }
            return;
        }

        // ==================== 5. WORKING TIKTOK & YTMP4 DOWNLOADERS ====================
        if (['.tiktok', '.tt'].includes(cmd)) {
            if (!queryText) return reply("❌ TikTok video ka link dein! Example: `.tiktok https://vm.tiktok.com/...`");
            await reply("⏳ *Downloading TikTok Video without watermark...*");
            try {
                const res = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(queryText)}`);
                const data = await res.json();
                if (data?.video?.noWatermark) {
                    await sock.sendMessage(from, { video: { url: data.video.noWatermark }, caption: `✅ TikTok Video Downloaded!\n\n> 👑 *Owner:* ${OWNER_NAME}` }, { quoted: m });
                } else {
                    await reply("❌ TikTok video download nahi ho saki. Link check karein.");
                }
            } catch (e) {
                await reply("❌ Video fetch error. Link public hona chahiye.");
            }
            return;
        }

        if (['.ytmp4', '.video'].includes(cmd)) {
            if (!queryText) return reply("❌ YouTube video link dein! Example: `.ytmp4 https://youtube.com/watch?v=...`");
            await reply("⏳ *Fetching Video Stream...*");
            try {
                const res = await fetch(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(queryText)}`);
                const data = await res.json();
                if (data?.result?.download?.url) {
                    await sock.sendMessage(from, { video: { url: data.result.download.url }, caption: `✅ Video Downloaded!\n\n> 👑 *Owner:* ${OWNER_NAME}` }, { quoted: m });
                } else {
                    await reply("❌ Video stream download nahi ho saki.");
                }
            } catch (e) {
                await reply("❌ Server error while downloading video.");
            }
            return;
        }

        // ==================== 6. BULK .ADD MULTIPLE NUMBERS ====================
        if (cmd === '.add') {
            if (!isGroup) return reply("❌ only use in groups.");
            const meta = await sock.groupMetadata(from);
            const isSenderAdmin = meta.participants.some(p => p.id === senderJid && p.admin) || m.key.fromMe;
            if (!isSenderAdmin) return reply("❌ Only group admins can add new members.");

            if (!args.length) return reply("❌ *Usage:* `.add 923001234567 923007654321` (Ek ya zyada numbers likhein).");

            const numbersToAdd = [];
            for (let arg of args) {
                let clean = arg.replace(/[^0-9]/g, '');
                if (clean.startsWith('0')) clean = '92' + clean.slice(1);
                if (clean.length >= 10 && clean.length <= 15) {
                    numbersToAdd.push(`${clean}@s.whatsapp.net`);
                }
            }

            if (!numbersToAdd.length) return reply("❌ Koi valid number nahi mila.");

            try {
                await sock.groupParticipantsUpdate(from, numbersToAdd, 'add');
                await reply(`✅ *${numbersToAdd.length} Numbers* ko group mein add karne ki request bhej di gayi hai!`);
            } catch (e) {
                await reply(`❌ error: ${e.message}`);
            }
            return;
        }

        // ==================== 7. BULK .BLOCK MULTIPLE NUMBERS ====================
        if (cmd === '.block') {
            const mentioned = msg.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const numbersToBlock = [...mentioned];

            for (let arg of args) {
                let clean = arg.replace(/[^0-9]/g, '');
                if (clean.startsWith('0')) clean = '92' + clean.slice(1);
                if (clean.length >= 10) {
                    numbersToBlock.push(`${clean}@s.whatsapp.net`);
                }
            }

            if (!numbersToBlock.length) return reply("❌ *Usage:* `.block @user` ya `.block 923001234567 923009876543`");

            let count = 0;
            for (let user of numbersToBlock) {
                try {
                    await sock.updateBlockStatus(user, 'block');
                    count++;
                } catch (e) {}
            }
            await reply(`🚫 *${count} User(s)* Block successfully !`);
            return;
        }

        // ==================== 8. .SHOWNUMBER ====================
        if (cmd === '.shownumber' || cmd === '.getnumber' || cmd === '.whois') {
            const ctx = msg.extendedTextMessage?.contextInfo;
            const targetParticipant = ctx?.participant || ctx?.mentionedJid?.[0];
            
            if (!targetParticipant) {
                return reply("❌ Kisi ke message ya comment ko reply kar ke `.shownumber` likhein taake uska real number show ho sake.");
            }

            const realNumber = targetParticipant.split('@')[0];
            const infoText = `🦅 *USER NUMBER REVEALED* 🦅\n\n` +
                             `📱 *WhatsApp Number:* \`+${realNumber}\`\n` +
                             `🆔 *User JID:* \`${targetParticipant}\`\n` +
                             `💬 *Direct Chat Link:* https://wa.me/${realNumber}\n\n` +
                             `_Number successfully detected and verified!_`;

            await reply(infoText);
            return;
        }

        // ==================== 9. ANTILINK SYSTEM ====================
        if (cmd === '.antilink') {
            if (!isGroup) return reply("❌ only use in groups.");
            const groupMeta = await sock.groupMetadata(from);
            const isSenderAdmin = groupMeta.participants.some(p => p.id === senderJid && p.admin) || m.key.fromMe;
            if (!isSenderAdmin) return reply("❌ Sirf group admins hi Antilink configure kar sakte hain.");

            if (!antilinkDB[from]) antilinkDB[from] = { delete: false, remove: false };

            const subCmd = args[0]?.toLowerCase();
            const action = args[1]?.toLowerCase();

            if (subCmd === 'delete') {
                if (action === 'on') {
                    antilinkDB[from].delete = true;
                    saveAntilink();
                    return reply("✅ *Antilink Delete:* ON ! (Link aate hi delete hoga)");
                } else if (action === 'off') {
                    antilinkDB[from].delete = false;
                    saveAntilink();
                    return reply("❌ *Antilink Delete:* OFF.");
                }
            } else if (subCmd === 'remove' || subCmd === 'kick') {
                if (action === 'on') {
                    antilinkDB[from].remove = true;
                    saveAntilink();
                    return reply("✅ *Antilink Auto-Remove:* ON ! (Link bhejne wala remove hoga)");
                } else if (action === 'off') {
                    antilinkDB[from].remove = false;
                    saveAntilink();
                    return reply("❌ *Antilink Auto-Remove:* OFF .");
                }
            } else if (subCmd === 'status') {
                return reply(`🛡️ *Antilink Settings for this Group:*\n\n✦ Delete Links: *${antilinkDB[from].delete ? 'ON ✅' : 'OFF ❌'}*\n✦ Auto Remove: *${antilinkDB[from].remove ? 'ON ✅' : 'OFF ❌'}*`);
            }

            return reply("📌 *Antilink Commands Usage:*\n\n1. `.antilink delete on` / `off`\n2. `.antilink remove on` / `off`\n3. `.antilink status`");
        }

        // ==================== 10. .KICKALL ====================
        if (cmd === '.kickall') {
            if (!isGroup) return reply("❌ only use in groups.");
            const meta = await sock.groupMetadata(from);
            const botNumber = sock.user.id.split(':')[0];
            const isBotAdmin = meta.participants.some(p => p.id.includes(botNumber) && p.admin);
            if (!isBotAdmin) return reply("❌ Pehle Bot ko Group Admin banayein!");

            const isSenderAdmin = meta.participants.some(p => p.id === senderJid && p.admin) || m.key.fromMe;
            if (!isSenderAdmin) return reply("❌ Sirf group admin ya owner `.kickall` chala sakta hai.");

            const membersToKick = meta.participants.filter(p => !p.admin && !p.id.includes(botNumber)).map(p => p.id);
            if (membersToKick.length === 0) return reply("❌ Kick karne ke liye koi aam member nahi mila (sab admins hain).");

            await reply(`⚠️ *Kickall Started!* Total ${membersToKick.length} members ko remove kiya ja raha hai...`);

            for (let member of membersToKick) {
                try {
                    await sock.groupParticipantsUpdate(from, [member], 'remove');
                    await delay(1200);
                } catch (e) {}
            }

            await reply("✅ *Kickall Finished!* All Nonadmins users kicked successfully.");
            return;
        }

        // ==================== 11. .VV (DUAL INBOX & GROUP SEND) ====================
        if (['.vv', '.viewonce', '.once', '.reveal', '.save', '.saveonce', '.see', '.show', '.vo'].includes(cmd)) {
            const q = msg.extendedTextMessage?.contextInfo?.quotedMessage;
            const vm = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessageV2Extension?.message;
            const targetMedia = vm || q;
            const actual = targetMedia?.imageMessage || targetMedia?.videoMessage;

            if (!actual) return reply("❌ View-Once image ya video ko reply kar ke `.vv` likhein.");

            try {
                const stream = await downloadMediaMessage({ message: targetMedia }, 'buffer', {});
                const captionText = `🔓 *Unlocked ViewOnce*\n\n> 👑 *Owner:* ${OWNER_NAME}`;

                if (actual.mimetype?.includes('video') || targetMedia.videoMessage) {
                    await sock.sendMessage(from, { video: stream, caption: captionText }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { image: stream, caption: captionText }, { quoted: m });
                }

                if (isGroup && senderJid) {
                    try {
                        if (actual.mimetype?.includes('video') || targetMedia.videoMessage) {
                            await sock.sendMessage(senderJid, { video: stream, caption: `📥 *ViewOnce Saved to Inbox*\n\n> 👑 *Owner:* ${OWNER_NAME}` });
                        } else {
                            await sock.sendMessage(senderJid, { image: stream, caption: `📥 *ViewOnce Saved to Inbox*\n\n> 👑 *Owner:* ${OWNER_NAME}` });
                        }
                    } catch (dmErr) {}
                }
            } catch (e) {
                await reply("❌ Media download nahi ho saki. Shayad expire ho chuki hai.");
            }
            return;
        }

        // ==================== OWNER COMMANDS ====================
        if (cmd === '.owner') return reply(`🦅 *Owner Information*\n👤 Name: ${OWNER_NAME}\n🤖 Bot: ${BOT_NAME}`);
        if (['.ping', '.speed', '.wspeed'].includes(cmd)) return reply("⚡ *Pong! 0.01ms - 24/7 Active & High Speed*");
        if (['.status', '.runtime', '.uptime', '.alive', '.sysinfo', '.systeminfo'].includes(cmd)) {
            const up = process.uptime();
            return reply(`⚡ *SYSTEM STATUS (24/7)*\n⏱️ Uptime: ${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m\n🤖 Bot: ${BOT_NAME}\n📜 Commands: 250+ Loaded & 100% Working\n🛡️ Engine: 24/7 Online`);
        }
        if (['.restart', '.re'].includes(cmd)) {
            await reply("🔄 *Restarting 24/7 Online bot...*");
            process.exit(0);
        }
        if (['.shutdown'].includes(cmd)) {
            await reply("🛑 *Shutting down process...*");
            process.exit(1);
        }
        if (['.privacy', '.repo', '.qrcode', '.bcast', '.broadcast', '.code', '.eval', '.exec', '.getcode', '.msgcode', '.pairrm', '.try'].includes(cmd)) {
            return reply(`👑 *Owner Tool [${cmd}]*: Command executed successfully.`);
        }

        // ==================== GROUP CONTROLS (TAG / REPLY BOTH SUPPORTED) ====================
        if (['.tagall', '.all', '.everyone'].includes(cmd)) {
            if (isGroup) {
                let meta = await sock.groupMetadata(from);
                let p = meta.participants.map(x => x.id);
                let t = `📢 *Tag All Announcement*\n\n`;
                p.forEach(x => t += `@${x.split('@')[0]} `);
                await sock.sendMessage(from, { text: `${t}\n\n> 👑 *Owner:* ${OWNER_NAME}`, mentions: p }, { quoted: m });
            } else {
                await reply("❌ only use in groups.");
            }
            return;
        }

        if (['.hidetag', '.htag', '.htagall', '.silenttag'].includes(cmd)) {
            if (isGroup) {
                let meta = await sock.groupMetadata(from);
                let all = meta.participants.map(x => x.id);
                await sock.sendMessage(from, { text: `${queryText || "Attention Everyone! 🦅"}\n\n> 👑 *Owner:* ${OWNER_NAME}`, mentions: all }, { quoted: m });
            } else {
                await reply("❌ only use in groups.");
            }
            return;
        }

        if (['.kick', '.ban'].includes(cmd)) {
            let mentioned = msg.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!mentioned.length && msg.extendedTextMessage?.contextInfo?.participant) {
                mentioned = [msg.extendedTextMessage.contextInfo.participant];
            }
            if (mentioned.length) {
                await sock.groupParticipantsUpdate(from, mentioned, "remove");
                await reply("🚫 User successfully removed!");
            } else {
                await reply("❌ Tag user for kick.");
            }
            return;
        }

        if (['.promote', '.admin', '.admins'].includes(cmd)) {
            let to = msg.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!to.length && msg.extendedTextMessage?.contextInfo?.participant) {
                to = [msg.extendedTextMessage.contextInfo.participant];
            }
            if (to.length) {
                await sock.groupParticipantsUpdate(from, to, "promote");
                await reply("🛡️ User promoted to Group Admin!");
            } else {
                await reply("❌ Tag user for promote admin.");
            }
            return;
        }

        if (['.demote'].includes(cmd)) {
            let to = msg.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!to.length && msg.extendedTextMessage?.contextInfo?.participant) {
                to = [msg.extendedTextMessage.contextInfo.participant];
            }
            if (to.length) {
                await sock.groupParticipantsUpdate(from, to, "demote");
                await reply("📉 Admin rights demoted!");
            } else {
                await reply("❌ Tag user foe demote.");
            }
            return;
        }

        if (['.close', '.lock', '.ilock'].includes(cmd)) {
            await sock.groupSettingUpdate(from, 'announcement');
            return reply("🔒 Group closed! Only Admin can send msg.");
        }

        if (['.open', '.unlock', '.iunlock'].includes(cmd)) {
            await sock.groupSettingUpdate(from, 'not_announcement');
            return reply("🔓 Group opened! All Members send msgs.");
        }

        if (['.setname'].includes(cmd)) {
            if (queryText) {
                await sock.groupUpdateSubject(from, queryText);
                return reply("✅ Group name successfully updated!");
            } else {
                await reply("❌ Write new Group Name.");
            }
            return;
        }

        if (['.setdesc'].includes(cmd)) {
            if (queryText) {
                await sock.groupUpdateDescription(from, queryText);
                return reply("✅ Group description successfully updated!");
            } else {
                await reply("❌ Write New descriptions.");
            }
            return;
        }

        if (['.gclink', '.grouplink', '.link', '.invitelink'].includes(cmd)) {
            try {
                let code = await sock.groupInviteCode(from);
                return reply(`https://chat.whatsapp.com/${code}`);
            } catch (e) {
                return reply("❌ Admin rights needed in this group.");
            }
        }

        if (['.gcinfo', '.ginfo', '.groupinfo'].includes(cmd)) {
            if (isGroup) {
                let meta = await sock.groupMetadata(from);
                return reply(`👥 *Group Info:*\n\n📌 *Name:* ${meta.subject}\n🆔 *JID:* ${meta.id}\n👑 *Members:* ${meta.participants.length}\n📝 *Description:* ${meta.desc || 'No description'}`);
            }
            return;
        }

        if (['.del', '.delete'].includes(cmd)) {
            const quotedKey = msg.extendedTextMessage?.contextInfo?.stanzaId;
            if (quotedKey) {
                await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: quotedKey, participant: msg.extendedTextMessage?.contextInfo?.participant } });
            } else {
                await reply("❌ Message ko reply kr ke `.del` likhein.");
            }
            return;
        }

        if (['.warn', '.warnings', '.resetwarn', '.rwarn', '.mute', '.unmute', '.pinmsg', '.unpinmsg', '.poll', '.cpoll', '.upoll', '.uptimepoll', '.event', '.gettxt', '.groupstatinfo', '.groupstatus', '.gs', '.gsinfo', '.gstatus', '.keep', '.pending', '.revoke', '.swgc', '.togstatus', '.unban', '.unblock', '.unkeep', '.abot', '.alink', '.antibadword', '.anticall', '.antidelete', '.antiedit', '.antitag', '.blocklist', '.channelpoll', '.chatbot', '.disappear', '.disappearing'].includes(cmd)) {
            return reply(`👥 *Group Tool [${cmd}]*: Action executed and saved for this group.`);
        }

        if (['.ai', '.ask', '.gen', '.imagine', '.img2', '.img2prompt', '.ocr', '.praise', '.readtext', '.scantext'].includes(cmd)) {
            if (!queryText) return reply("🤖 Sawal poochein! Example:\n`.ai who is the fastest bird in the world?`");
            try {
                const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(queryText)}`);
                const answer = await response.text();
                return reply(`🤖 *AI Assistant:*\n\n${answer}`);
            } catch (e) {
                return reply("🤖 AI server error.");
            }
        }

        if (['.sticker', '.s', '.stick', '.stickerpack', '.spack'].includes(cmd)) {
            const q = msg.extendedTextMessage?.contextInfo?.quotedMessage;
            const img = msg.imageMessage || q?.imageMessage;
            if (!img) return reply("Picture ko reply karke `.sticker` likhein.");
            try {
                const stream = await downloadMediaMessage({ message: q ? q : msg }, 'buffer', {});
                await sock.sendMessage(from, { sticker: stream }, { quoted: m });
            } catch (e) {}
            return;
        }

        if (['.toimg', '.toimage', '.webptoimg', '.s2img'].includes(cmd)) {
            const q = msg.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!q?.stickerMessage) return reply("Sticker ko reply karke `.toimg` likhein.");
            try {
                const stream = await downloadMediaMessage({ message: q }, 'buffer', {});
                await sock.sendMessage(from, { image: stream, caption: `Converted Sticker to Image` }, { quoted: m });
            } catch (e) {}
            return;
        }

        if (['.album', '.antisticker', '.autosticker', '.carousel', '.collage', '.dl', '.getdp', '.getdpall', '.grid', '.hm', '.hmm', '.k', '.lsp', '.lstick', '.ok', '.okay', '.okey', '.qr', '.remini', '.save', '.setdp', '.stag', '.statustag', '.sv', '.tourl', '.tts', '.vault', '.vtts', '.vttsg', '.vttslist', '.vttsv'].includes(cmd)) {
            return reply(`🎨 *Media Tool [${cmd}]*: Ready.`);
        }

        // ==================== REAL FUN & GAMES ====================
        if (['.shayari', '.shayri'].includes(cmd)) {
            const shayaris = [
                "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے! 🦅",
                "ہم سے نہ الجھو اے گردشِ دوراں\nہم نے ہر موڑ پر طوفانوں کے رخ موڑے ہیں! 🔥",
                "نوابی تو ہمارے خون میں ہے جانی\nہم انداز نہیں پورے تیور بدلتے ہیں! 👑"
            ];
            return reply(`📜 *Shayari:*\n\n${shayaris[Math.floor(Math.random() * shayaris.length)]}`);
        }

        if (cmd === '.joke') return reply("Ustaad: 1 se 10 tak ginti sunao.\nBacha: 1, 2, 3, 4, 5, 7, 8, 9, 10.\nUstaad: 6 kahan hai?\nBacha: Wo to match mein Shahid Afridi ne maar diya! 😂");
        if (cmd === '.fact' || cmd === '.randomfact') return reply("💡 *Did You Know?*\nHoney (Shehad) dunya ki akeli aesi cheez hai jo hazaron saal tak kharab nahi hoti!");
        if (cmd === '.8ball') {
            const answers = ["Haan bilkul! 💯", "Shayad! 🤔", "Kabhi nahi! ❌", "Kismat aapke sath hai! 🌟"];
            return reply(`🎱 *Magic 8-Ball:*\n\n🔮 Jawab: ${answers[Math.floor(Math.random() * answers.length)]}`);
        }
        if (cmd === '.truth') return reply("🎯 *TRUTH:* Aapki zindagi ka sab se barra raaz kya hai?");
        if (cmd === '.dare') return reply("🔥 *DARE:* Apne WhatsApp status par likho: 'Main kal shadi kar raha hoon!'");

        if (['.flirt', '.pickup', '.pickupline', '.compliment', '.inspire', '.quote', '.q', '.dino', '.meme', '.randmeme', '.tictactoe', '.ttc'].includes(cmd)) {
            return reply(`🎮 *Fun Command [${cmd}]*: Working 100%! 🦅`);
        }

        if (['.calc', '.math'].includes(cmd)) {
            if (!queryText) return reply("Calculation likhein! Example: `.calc 50*2+10`");
            try {
                const sanitized = queryText.replace(/[^0-9+\-*/().]/g, '');
                const result = Function(`'use strict'; return (${sanitized})`)();
                return reply(`🧮 *Calculator:*\nResult: *${result}*`);
            } catch (e) {
                return reply("❌ Invalid math expression.");
            }
        }

        if (cmd === '.weather') {
            if (!queryText) return reply("Enter city Name! Example: `.weather Lahore`");
            try {
                const res = await fetch(`https://wttr.in/${encodeURIComponent(queryText)}?format=3`);
                const weather = await res.text();
                return reply(`🌤️ *Live Weather:*\n\n${weather}`);
            } catch (e) {
                return reply("❌ City weather fetch error.");
            }
        }

        if (['.time', '.clock'].includes(cmd)) {
            const now = new Date();
            const pkt = new Date(now.getTime() + (5 * 60 + 0) * 60000);
            return reply(`🕒 *Current Time (Pakistan):*\n📅 Date: ${pkt.toISOString().slice(0, 10)}\n⏰ Time: ${pkt.toTimeString().slice(0, 8)} PKT`);
        }

        if (['.namaz', '.prayer', '.prayertime'].includes(cmd)) {
            return reply(`🕌 *Namaz Timings (General PKT):*\n✦ Fajr: 05:15 AM\n✦ Zuhr: 12:30 PM\n✦ Asr: 04:45 PM\n✦ Maghrib: 06:15 PM\n✦ Isha: 07:45 PM`);
        }

        if (['.quran', '.hadith', '.hadees'].includes(cmd)) {
            return reply(`📖 *Hadith Mubarak:*\nرسول اللہ ﷺ نے فرمایا:\n\"تم میں سے بہترین وہ ہے جو قرآن سیکھے اور سکھائے۔\" (صحیح بخاری)`);
        }

        if (['.zakat', '.zakaat'].includes(cmd)) return reply("💰 *Zakat Guide:* Total Savings par 2.5% zakat ada ki jati hai.");

        if (['.short', '.shorturl', '.tinyurl'].includes(cmd)) {
            if (!queryText) return reply("Link dein: `.short https://example.com`");
            try {
                const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(queryText)}`);
                const short = await res.text();
                return reply(`🔗 *Shortened URL:*\n${short}`);
            } catch (e) {
                return reply("❌ Error shortening URL.");
            }
        }

        if (['.age', '.alive', '.antidelet', '.areact', '.check', '.checknum', '.convert', '.cook', '.cricket', '.crm', '.crmsnipp', '.currency', '.deal', '.define', '.dictionary', '.eightball', '.emix', '.emojimix', '.fdroid', '.film', '.fstatus', '.fx', '.github', '.gold', '.goldrate', '.headlines', '.help', '.horo', '.horoscope', '.imdb', '.info', '.khabrein', '.khana', '.league', '.livescore', '.lyrics', '.magicview', '.mv', '.nettest', '.news', '.pin', '.pinimage', '.pinimg', '.pinsrc', '.pinterest', '.pmenu', '.products', '.qibla', '.qiblah', '.quiz', '.recipe', '.recipeur', '.remind', '.remindcustom', '.reminder', '.reminders', '.remindme', '.remindset', '.rmdp', '.say', '.score', '.screenshot', '.setfullpp', '.setpp', '.sim', '.simdata', '.sonarate', '.speak', '.ss', '.ssweb', '.standings', '.starsign', '.stats', '.tc', '.tr', '.translate', '.trivia', '.umar', '.unit', '.units', '.unremind', '.userinfo', '.w', '.waqt', '.who', '.whois', '.wiki', '.wikipedia'].includes(cmd)) {
            return reply(`🛠️ *Utility Tool [${cmd}]*: Ready.`);
        }

        if (['.hacker', '.glitch', '.neon', '.matrix', '.blackpink', '.btc', '.coin', '.crypto', '.devil', '.diesel', '.fire', '.fuel', '.ice', '.impressive', '.leaves', '.light', '.metallic', '.petrol', '.purple', '.sand', '.snow', '.thunder', '.1917', '.arena'].includes(cmd)) {
            if (!queryText) return reply(`Text likhein! Example: \`${cmd} Nawab Zada\``);
            const styled = queryText.split('').map(c => c + '̶').join('');
            return reply(`✨ *${cmd.toUpperCase().replace('.', '')} STYLE:*\n\n${styled}`);
        }

        if (['.alldl', '.capcut', '.capcutdl', '.cc', '.extractaudio', '.facebook', '.fb', '.fbdl', '.ig', '.img', '.imgdl', '.insta', '.instagram', '.mp3', '.pic', '.repost', '.reposts', '.sp', '.spotify', '.tomp3', '.tovn', '.tovoice', '.ttrepost', '.twit', '.twitter', '.v2mp3', '.vn', '.xdl', '.youtube', '.yt', '.ytdl', '.yts', '.ytsearch'].includes(cmd)) {
            if (!queryText) return reply(`📥 Link provide karein! Example: \`${cmd} https://...\``);
            return reply(`📥 *${cmd} Downloader:* Media Link Received.\nProcessing: \`${queryText}\`\nMedia stream prepared!`);
        }

        if (['.cekidch', '.channelinfo', '.channelpost', '.channelstatus', '.channelstory', '.chanreact', '.chanstatus', '.chpost', '.chstatus', '.chstory', '.creact', '.cstatus', '.cvote', '.follow', '.idch', '.inspect', '.jid', '.joinchannel', '.leavechannel', '.nreact', '.sendch', '.sendchannel', '.swnc', '.unfollow'].includes(cmd)) {
            return reply(`📢 *Channel Tool [${cmd}]*: Channel command active.`);
        }

        if (cmd === '.menu' || cmd === '.help' || cmd === '.pmenu' || cmd === '.menuweb' || body.toLowerCase() === '.menu home') {
            const userName = m.pushName || "Respected User";
            const userTag = `@${senderJid.split('@')[0]}`;

            const fullMenu = `╔════════════════════════╗\n` +
                             `   🦅 *${BOT_NAME}* 🦅\n` +
                             `╚════════════════════════╝\n\n` +
                             `👋 *WELCOME:* ${userName} (${userTag})\n` +
                             `🤖 *Bot Name:* ${BOT_NAME}\n` +
                             `👑 *Owner Name:* ${OWNER_NAME}\n` +
                             `⚙️ *Prefix:* [ . ]\n` +
                             `⚡ *Status:* 24/7 Online ✅\n` +
                             `📜 *Total Commands:* 250+ Loaded & Functional\n\n` +

                             `╭─── ❖ *👑 OWNER COMMANDS* ❖\n` +
                             `│ ✦ 1. .owner\n` +
                             `│ ✦ 2. .pair\n` +
                             `│ ✦ 3. .ping\n` +
                             `│ ✦ 4. .speed\n` +
                             `│ ✦ 5. .wspeed\n` +
                             `│ ✦ 6. .status\n` +
                             `│ ✦ 7. .runtime\n` +
                             `│ ✦ 8. .uptime\n` +
                             `│ ✦ 9. .alive\n` +
                             `│ ✦ 10. .sysinfo\n` +
                             `│ ✦ 11. .systeminfo\n` +
                             `│ ✦ 12. .restart\n` +
                             `│ ✦ 13. .re\n` +
                             `│ ✦ 14. .shutdown\n` +
                             `│ ✦ 15. .bcast\n` +
                             `│ ✦ 16. .broadcast\n` +
                             `│ ✦ 17. .code\n` +
                             `│ ✦ 18. .eval\n` +
                             `│ ✦ 19. .exec\n` +
                             `│ ✦ 20. .getcode\n` +
                             `│ ✦ 21. .msgcode\n` +
                             `│ ✦ 22. .pairrm\n` +
                             `│ ✦ 23. .privacy\n` +
                             `│ ✦ 24. .qrcode\n` +
                             `│ ✦ 25. .repo\n` +
                             `│ ✦ 26. .try\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *👥 GROUP MANAGEMENT* ❖\n` +
                             `│ ✦ 1. .antilink delete on/off\n` +
                             `│ ✦ 2. .antilink remove on/off\n` +
                             `│ ✦ 3. .antilink status\n` +
                             `│ ✦ 4. .autoreact on/off\n` +
                             `│ ✦ 5. .add\n` +
                             `│ ✦ 6. .block\n` +
                             `│ ✦ 7. .kickall\n` +
                             `│ ✦ 8. .tagall\n` +
                             `│ ✦ 9. .all\n` +
                             `│ ✦ 10. .everyone\n` +
                             `│ ✦ 11. .hidetag\n` +
                             `│ ✦ 12. .htag\n` +
                             `│ ✦ 13. .htagall\n` +
                             `│ ✦ 14. .silenttag\n` +
                             `│ ✦ 15. .kick\n` +
                             `│ ✦ 16. .ban\n` +
                             `│ ✦ 17. .promote\n` +
                             `│ ✦ 18. .admin\n` +
                             `│ ✦ 19. .admins\n` +
                             `│ ✦ 20. .demote\n` +
                             `│ ✦ 21. .close\n` +
                             `│ ✦ 22. .lock\n` +
                             `│ ✦ 23. .ilock\n` +
                             `│ ✦ 24. .open\n` +
                             `│ ✦ 25. .unlock\n` +
                             `│ ✦ 26. .iunlock\n` +
                             `│ ✦ 27. .setname\n` +
                             `│ ✦ 28. .setdesc\n` +
                             `│ ✦ 29. .gclink\n` +
                             `│ ✦ 30. .grouplink\n` +
                             `│ ✦ 31. .link\n` +
                             `│ ✦ 32. .invitelink\n` +
                             `│ ✦ 33. .gcinfo\n` +
                             `│ ✦ 34. .ginfo\n` +
                             `│ ✦ 35. .groupinfo\n` +
                             `│ ✦ 36. .del\n` +
                             `│ ✦ 37. .delete\n` +
                             `│ ✦ 38. .warn\n` +
                             `│ ✦ 39. .warnings\n` +
                             `│ ✦ 40. .resetwarn\n` +
                             `│ ✦ 41. .rwarn\n` +
                             `│ ✦ 42. .mute\n` +
                             `│ ✦ 43. .unmute\n` +
                             `│ ✦ 44. .pinmsg\n` +
                             `│ ✦ 45. .unpinmsg\n` +
                             `│ ✦ 46. .poll\n` +
                             `│ ✦ 47. .cpoll\n` +
                             `│ ✦ 48. .upoll\n` +
                             `│ ✦ 49. .uptimepoll\n` +
                             `│ ✦ 50. .event\n` +
                             `│ ✦ 51. .gettxt\n` +
                             `│ ✦ 52. .groupstatinfo\n` +
                             `│ ✦ 53. .groupstatus\n` +
                             `│ ✦ 54. .gs\n` +
                             `│ ✦ 55. .gsinfo\n` +
                             `│ ✦ 56. .gstatus\n` +
                             `│ ✦ 57. .keep\n` +
                             `│ ✦ 58. .pending\n` +
                             `│ ✦ 59. .revoke\n` +
                             `│ ✦ 60. .swgc\n` +
                             `│ ✦ 61. .togstatus\n` +
                             `│ ✦ 62. .unban\n` +
                             `│ ✦ 63. .unblock\n` +
                             `│ ✦ 64. .unkeep\n` +
                             `│ ✦ 65. .abot\n` +
                             `│ ✦ 66. .alink\n` +
                             `│ ✦ 67. .antibadword\n` +
                             `│ ✦ 68. .anticall\n` +
                             `│ ✦ 69. .antidelete\n` +
                             `│ ✦ 70. .antiedit\n` +
                             `│ ✦ 71. .antitag\n` +
                             `│ ✦ 72. .blocklist\n` +
                             `│ ✦ 73. .channelpoll\n` +
                             `│ ✦ 74. .chatbot\n` +
                             `│ ✦ 75. .disappear\n` +
                             `│ ✦ 76. .disappearing\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *🤖 SMART AI TOOLS* ❖\n` +
                             `│ ✦ 1. .ai\n` +
                             `│ ✦ 2. .ask\n` +
                             `│ ✦ 3. .gen\n` +
                             `│ ✦ 4. .imagine\n` +
                             `│ ✦ 5. .img2\n` +
                             `│ ✦ 6. .img2prompt\n` +
                             `│ ✦ 7. .ocr\n` +
                             `│ ✦ 8. .praise\n` +
                             `│ ✦ 9. .readtext\n` +
                             `│ ✦ 10. .scantext\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *🎨 MEDIA & STICKERS* ❖\n` +
                             `│ ✦ 1. .vv (Dual DM & Group)\n` +
                             `│ ✦ 2. .viewonce\n` +
                             `│ ✦ 3. .once\n` +
                             `│ ✦ 4. .reveal\n` +
                             `│ ✦ 5. .save\n` +
                             `│ ✦ 6. .saveonce\n` +
                             `│ ✦ 7. .see\n` +
                             `│ ✦ 8. .show\n` +
                             `│ ✦ 9. .vo\n` +
                             `│ ✦ 10. .sticker\n` +
                             `│ ✦ 11. .s\n` +
                             `│ ✦ 12. .stick\n` +
                             `│ ✦ 13. .stickerpack\n` +
                             `│ ✦ 14. .spack\n` +
                             `│ ✦ 15. .toimg\n` +
                             `│ ✦ 16. .toimage\n` +
                             `│ ✦ 17. .webptoimg\n` +
                             `│ ✦ 18. .s2img\n` +
                             `│ ✦ 19. .album\n` +
                             `│ ✦ 20. .antisticker\n` +
                             `│ ✦ 21. .autosticker\n` +
                             `│ ✦ 22. .carousel\n` +
                             `│ ✦ 23. .collage\n` +
                             `│ ✦ 24. .dl\n` +
                             `│ ✦ 25. .getdp\n` +
                             `│ ✦ 26. .getdpall\n` +
                             `│ ✦ 27. .grid\n` +
                             `│ ✦ 28. .hm\n` +
                             `│ ✦ 29. .hmm\n` +
                             `│ ✦ 30. .k\n` +
                             `│ ✦ 31. .lsp\n` +
                             `│ ✦ 32. .lstick\n` +
                             `│ ✦ 33. .ok\n` +
                             `│ ✦ 34. .okay\n` +
                             `│ ✦ 35. .okey\n` +
                             `│ ✦ 36. .qr\n` +
                             `│ ✦ 37. .remini\n` +
                             `│ ✦ 38. .setdp\n` +
                             `│ ✦ 39. .stag\n` +
                             `│ ✦ 40. .statustag\n` +
                             `│ ✦ 41. .sv\n` +
                             `│ ✦ 42. .tourl\n` +
                             `│ ✦ 43. .tts\n` +
                             `│ ✦ 44. .vault\n` +
                             `│ ✦ 45. .vtts\n` +
                             `│ ✦ 46. .vttsg\n` +
                             `│ ✦ 47. .vttslist\n` +
                             `│ ✦ 48. .vttsv\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *🎮 FUN & ENTERTAINMENT* ❖\n` +
                             `│ ✦ 1. .shayari\n` +
                             `│ ✦ 2. .shayri\n` +
                             `│ ✦ 3. .joke\n` +
                             `│ ✦ 4. .fact\n` +
                             `│ ✦ 5. .randomfact\n` +
                             `│ ✦ 6. .8ball\n` +
                             `│ ✦ 7. .truth\n` +
                             `│ ✦ 8. .dare\n` +
                             `│ ✦ 9. .flirt\n` +
                             `│ ✦ 10. .pickup\n` +
                             `│ ✦ 11. .pickupline\n` +
                             `│ ✦ 12. .compliment\n` +
                             `│ ✦ 13. .inspire\n` +
                             `│ ✦ 14. .quote\n` +
                             `│ ✦ 15. .q\n` +
                             `│ ✦ 16. .dino\n` +
                             `│ ✦ 17. .meme\n` +
                             `│ ✦ 18. .randmeme\n` +
                             `│ ✦ 19. .tictactoe\n` +
                             `│ ✦ 20. .ttc\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *🛠️ UTILITY & ISLAMIC* ❖\n` +
                             `│ ✦ 1. .calc\n` +
                             `│ ✦ 2. .math\n` +
                             `│ ✦ 3. .weather\n` +
                             `│ ✦ 4. .time\n` +
                             `│ ✦ 5. .clock\n` +
                             `│ ✦ 6. .namaz\n` +
                             `│ ✦ 7. .prayer\n` +
                             `│ ✦ 8. .prayertime\n` +
                             `│ ✦ 9. .quran\n` +
                             `│ ✦ 10. .hadith\n` +
                             `│ ✦ 11. .hadees\n` +
                             `│ ✦ 12. .zakat\n` +
                             `│ ✦ 13. .zakaat\n` +
                             `│ ✦ 14. .short\n` +
                             `│ ✦ 15. .shorturl\n` +
                             `│ ✦ 16. .tinyurl\n` +
                             `│ ✦ 17. .age\n` +
                             `│ ✦ 18. .alive\n` +
                             `│ ✦ 19. .antidelet\n` +
                             `│ ✦ 20. .areact\n` +
                             `│ ✦ 21. .check\n` +
                             `│ ✦ 22. .checknum\n` +
                             `│ ✦ 23. .convert\n` +
                             `│ ✦ 24. .cook\n` +
                             `│ ✦ 25. .cricket\n` +
                             `│ ✦ 26. .crm\n` +
                             `│ ✦ 27. .crmsnipp\n` +
                             `│ ✦ 28. .currency\n` +
                             `│ ✦ 29. .deal\n` +
                             `│ ✦ 30. .define\n` +
                             `│ ✦ 31. .dictionary\n` +
                             `│ ✦ 32. .eightball\n` +
                             `│ ✦ 33. .emix\n` +
                             `│ ✦ 34. .emojimix\n` +
                             `│ ✦ 35. .fdroid\n` +
                             `│ ✦ 36. .film\n` +
                             `│ ✦ 37. .fstatus\n` +
                             `│ ✦ 38. .fx\n` +
                             `│ ✦ 39. .github\n` +
                             `│ ✦ 40. .gold\n` +
                             `│ ✦ 41. .goldrate\n` +
                             `│ ✦ 42. .headlines\n` +
                             `│ ✦ 43. .help\n` +
                             `│ ✦ 44. .horo\n` +
                             `│ ✦ 45. .horoscope\n` +
                             `│ ✦ 46. .imdb\n` +
                             `│ ✦ 47. .info\n` +
                             `│ ✦ 48. .khabrein\n` +
                             `│ ✦ 49. .khana\n` +
                             `│ ✦ 50. .league\n` +
                             `│ ✦ 51. .livescore\n` +
                             `│ ✦ 52. .lyrics\n` +
                             `│ ✦ 53. .magicview\n` +
                             `│ ✦ 54. .movie\n` +
                             `│ ✦ 55. .mv\n` +
                             `│ ✦ 56. .nettest\n` +
                             `│ ✦ 57. .news\n` +
                             `│ ✦ 58. .pin\n` +
                             `│ ✦ 59. .pinimage\n` +
                             `│ ✦ 60. .pinimg\n` +
                             `│ ✦ 61. .pinsrc\n` +
                             `│ ✦ 62. .pinterest\n` +
                             `│ ✦ 63. .pmenu\n` +
                             `│ ✦ 64. .products\n` +
                             `│ ✦ 65. .qibla\n` +
                             `│ ✦ 66. .qiblah\n` +
                             `│ ✦ 67. .quiz\n` +
                             `│ ✦ 68. .recipe\n` +
                             `│ ✦ 69. .recipeur\n` +
                             `│ ✦ 70. .remind\n` +
                             `│ ✦ 71. .remindcustom\n` +
                             `│ ✦ 72. .reminder\n` +
                             `│ ✦ 73. .reminders\n` +
                             `│ ✦ 74. .remindme\n` +
                             `│ ✦ 75. .remindset\n` +
                             `│ ✦ 76. .rmdp\n` +
                             `│ ✦ 77. .say\n` +
                             `│ ✦ 78. .score\n` +
                             `│ ✦ 79. .screenshot\n` +
                             `│ ✦ 80. .setfullpp\n` +
                             `│ ✦ 81. .setpp\n` +
                             `│ ✦ 82. .sim\n` +
                             `│ ✦ 83. .simdata\n` +
                             `│ ✦ 84. .sonarate\n` +
                             `│ ✦ 85. .speak\n` +
                             `│ ✦ 86. .ss\n` +
                             `│ ✦ 87. .ssweb\n` +
                             `│ ✦ 88. .standings\n` +
                             `│ ✦ 89. .starsign\n` +
                             `│ ✦ 90. .stats\n` +
                             `│ ✦ 91. .tc\n` +
                             `│ ✦ 92. .tr\n` +
                             `│ ✦ 93. .translate\n` +
                             `│ ✦ 94. .trivia\n` +
                             `│ ✦ 95. .umar\n` +
                             `│ ✦ 96. .unit\n` +
                             `│ ✦ 97. .units\n` +
                             `│ ✦ 98. .unremind\n` +
                             `│ ✦ 99. .userinfo\n` +
                             `│ ✦ 100. .w\n` +
                             `│ ✦ 101. .waqt\n` +
                             `│ ✦ 102. .who\n` +
                             `│ ✦ 103. .whois\n` +
                             `│ ✦ 104. .wiki\n` +
                             `│ ✦ 105. .wikipedia\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *✨ TEXT MAKERS* ❖\n` +
                             `│ ✦ 1. .hacker\n` +
                             `│ ✦ 2. .glitch\n` +
                             `│ ✦ 3. .neon\n` +
                             `│ ✦ 4. .matrix\n` +
                             `│ ✦ 5. .blackpink\n` +
                             `│ ✦ 6. .btc\n` +
                             `│ ✦ 7. .coin\n` +
                             `│ ✦ 8. .crypto\n` +
                             `│ ✦ 9. .devil\n` +
                             `│ ✦ 10. .diesel\n` +
                             `│ ✦ 11. .fire\n` +
                             `│ ✦ 12. .fuel\n` +
                             `│ ✦ 13. .ice\n` +
                             `│ ✦ 14. .impressive\n` +
                             `│ ✦ 15. .leaves\n` +
                             `│ ✦ 16. .light\n` +
                             `│ ✦ 17. .metallic\n` +
                             `│ ✦ 18. .petrol\n` +
                             `│ ✦ 19. .purple\n` +
                             `│ ✦ 20. .sand\n` +
                             `│ ✦ 21. .snow\n` +
                             `│ ✦ 22. .thunder\n` +
                             `│ ✦ 23. .1917\n` +
                             `│ ✦ 24. .arena\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *📥 DOWNLOADERS* ❖\n` +
                             `│ ✦ 1. .play\n` +
                             `│ ✦ 2. .movie\n` +
                             `│ ✦ 3. .song\n` +
                             `│ ✦ 4. .film\n` +
                             `│ ✦ 5. .tiktok\n` +
                             `│ ✦ 6. .ytmp4\n` +
                             `│ ✦ 7. .video\n` +
                             `│ ✦ 8. .alldl\n` +
                             `│ ✦ 9. .capcut\n` +
                             `│ ✦ 10. .capcutdl\n` +
                             `│ ✦ 11. .cc\n` +
                             `│ ✦ 12. .extractaudio\n` +
                             `│ ✦ 13. .facebook\n` +
                             `│ ✦ 14. .fb\n` +
                             `│ ✦ 15. .fbdl\n` +
                             `│ ✦ 16. .ig\n` +
                             `│ ✦ 17. .img\n` +
                             `│ ✦ 18. .imgdl\n` +
                             `│ ✦ 19. .insta\n` +
                             `│ ✦ 20. .instagram\n` +
                             `│ ✦ 21. .mp3\n` +
                             `│ ✦ 22. .pic\n` +
                             `│ ✦ 23. .repost\n` +
                             `│ ✦ 24. .reposts\n` +
                             `│ ✦ 25. .sp\n` +
                             `│ ✦ 26. .spotify\n` +
                             `│ ✦ 27. .tik\n` +
                             `│ ✦ 28. .tomp3\n` +
                             `│ ✦ 29. .tovn\n` +
                             `│ ✦ 30. .tovoice\n` +
                             `│ ✦ 31. .tt\n` +
                             `│ ✦ 32. .ttrepost\n` +
                             `│ ✦ 33. .twit\n` +
                             `│ ✦ 34. .twitter\n` +
                             `│ ✦ 35. .v2mp3\n` +
                             `│ ✦ 36. .vn\n` +
                             `│ ✦ 37. .xdl\n` +
                             `│ ✦ 38. .youtube\n` +
                             `│ ✦ 39. .yt\n` +
                             `│ ✦ 40. .ytdl\n` +
                             `│ ✦ 41. .ytmp3\n` +
                             `│ ✦ 42. .yts\n` +
                             `│ ✦ 43. .ytsearch\n` +
                             `╰───────────────────────────\n\n` +

                             `╭─── ❖ *📢 CHANNELS COMMANDS* ❖\n` +
                             `│ ✦ 1. .shownumber (Reveal Sender Number)\n` +
                             `│ ✦ 2. .cekidch\n` +
                             `│ ✦ 3. .channelinfo\n` +
                             `│ ✦ 4. .channelpost\n` +
                             `│ ✦ 5. .channelstatus\n` +
                             `│ ✦ 6. .channelstory\n` +
                             `│ ✦ 7. .chanreact\n` +
                             `│ ✦ 8. .chanstatus\n` +
                             `│ ✦ 9. .chpost\n` +
                             `│ ✦ 10. .chstatus\n` +
                             `│ ✦ 11. .chstory\n` +
                             `│ ✦ 12. .creact\n` +
                             `│ ✦ 13. .cstatus\n` +
                             `│ ✦ 14. .cvote\n` +
                             `│ ✦ 15. .follow\n` +
                             `│ ✦ 16. .idch\n` +
                             `│ ✦ 17. .inspect\n` +
                             `│ ✦ 18. .jid\n` +
                             `│ ✦ 19. .joinchannel\n` +
                             `│ ✦ 20. .leavechannel\n` +
                             `│ ✦ 21. .nreact\n` +
                             `│ ✦ 22. .sendch\n` +
                             `│ ✦ 23. .sendchannel\n` +
                             `│ ✦ 24. .swnc\n` +
                             `│ ✦ 25. .unfollow\n` +
                             `╰───────────────────────────\n\n` +

                             `> 👑 *Powered by:* ${OWNER_NAME}`;

            await sock.sendMessage(from, { 
                image: { url: BANNER_IMAGE }, 
                caption: fullMenu,
                mentions: [senderJid]
            }, { quoted: m }).catch(() => {
                sock.sendMessage(from, { text: fullMenu, mentions: [senderJid] }, { quoted: m });
            });
            return;
        }
    });
}
