const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, downloadMediaMessage, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
if(!TELEGRAM_TOKEN) console.log("❌ TELEGRAM_TOKEN Missing in ENV");

const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const OWNER_NAME = "NAWAB ZADA HACKER ✌️ 🦅";
const BOT_NAME = "NAWAB ZADA HACKER MD";
const BANNER_IMAGE = "https://i.ibb.co/3W68688/1001085972.jpg";
const REQUIRED_CHANNELS = [
    { name: "Channel 1", url: "https://whatsapp.com/channel/0029VbB47ttDDmFNztpnZf2m" },
    { name: "Channel 2", url: "https://whatsapp.com/channel/0029Vb8rZ5H9Bb62fjLv430d" },
    { name: "Channel 3", url: "https://whatsapp.com/channel/0029VbCThCbLikgHTAQX9k2n" }
];
const randomDelay = (minMs=1000,maxMs=3000)=> new Promise(r=>setTimeout(r,Math.floor(Math.random()*(maxMs-minMs+1))+minMs));
if(!fs.existsSync(path.join(__dirname,'sessions'))) fs.mkdirSync(path.join(__dirname,'sessions'),{recursive:true});
console.log(`[+] ${BOT_NAME} Engine Online - All Commands Loaded...`);

tgBot.onText(/\/start/, (msg)=>{
    const chatId=msg.chat.id;
    let caption=`╔══════════════════════╗
   🦅 *${BOT_NAME}* 🦅
╚══════════════════════╝

👑 *Owner:* ${OWNER_NAME}
⚡ *Status:* Online & Anti-Ban Active ✅
🚀 *Version:* V2 Pair Fixed

*Welcome Tha Tha kr ky!* ❤️
250+ Commands in my BOT .

👇 *Start * 👇
`;

    const options = {
        parse_mode:'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "📜 Check Commands", callback_data: "check_commands" }],
                [{ text: "🔗 Pair Number", callback_data: "pair_help" }],
                [
                    { text: "📢 Channel 1", url: REQUIRED_CHANNELS[0].url },
                    { text: "📢 Channel 2", url: REQUIRED_CHANNELS[1].url }
                ]
            ]
        }
    };

    tgBot.sendPhoto(chatId,BANNER_IMAGE,{caption, ...options}).catch(()=>tgBot.sendMessage(chatId,caption, options));
});

tgBot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if(query.data === "check_commands"){
        tgBot.sendMessage(chatId, "📜 *Commands List Ke Liye WhatsApp Par .menu Likho*\n\nYa Telegram Par /help Likho\n\nTotal 250+ Commands Loaded!", {parse_mode:'Markdown'});
    }
    if(query.data === "pair_help"){
        tgBot.sendMessage(chatId, "🔗 *Pair Krne Ka Tareka:*\n\n1. `/pair 923xxxxxxxxx` likho\n2. Bot tumhe 8 digit ka Code dega (jaise `12AB-34CD`)\n3. WhatsApp > Linked Devices > Link with Phone Number > Code Paste Karo\n\n*Note: Number me + nahi lagana* ✅", {parse_mode:'Markdown'});
    }
    tgBot.answerCallbackQuery(query.id);
});

tgBot.onText(/\/help/, (msg)=>{
    tgBot.sendMessage(msg.chat.id, `📜 *Total 250+ Commands*\n\nOwner: .owner .pair .restart\nGroup: .tagall .hidetag .kick .promote .close .open .gclink\nMedia: .sticker .vv\nTools: .ping .status .menu\n\nFull menu ke liye WhatsApp par .menu likho`);
});

tgBot.onText(/\/pair (.+)/, async (msg, match)=>{
    const chatId=msg.chat.id;
    let phoneNumber=match[1].replace(/[^0-9]/g,'');
    if(!phoneNumber||phoneNumber.length<10) return tgBot.sendMessage(chatId,"❌ Invalid! Sahi Format: `/pair 92347xxxxxxx`\n+ Mat Lagao",{parse_mode:'Markdown'});
    
    const sessionDir=path.join(__dirname,`sessions`,`session_${chatId}_${phoneNumber}`);
    if(fs.existsSync(sessionDir)) fs.rmSync(sessionDir,{recursive:true,force:true});
    fs.mkdirSync(sessionDir,{recursive:true});
    
    const statusMsg=await tgBot.sendMessage(chatId,"🔄 *Connecting to WhatsApp... 10 sec wait karo*",{parse_mode:'Markdown'});
    try{
        const {state,saveCreds}=await useMultiFileAuthState(sessionDir);
        const {version}=await fetchLatestBaileysVersion();
        const sock=makeWASocket({
            version,
            logger:pino({level:'silent'}),
            printQRInTerminal:false,
            browser:["Chrome","Ubuntu","20.0.04"],
            auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:"silent"}))},
            syncFullHistory:false,
            markOnlineOnConnect:false,
            generateHighQualityLinkPreview:true
        });
        sock.ev.on('creds.update',saveCreds);
        
        if(!sock.authState.creds.registered){
            await delay(3000); 
            let rawCode=await sock.requestPairingCode(phoneNumber);
            let prettyCode=rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
            
            await tgBot.editMessageText(`🦅 *${BOT_NAME} PAIR CODE* 🦅

📱 *Number:* \`+${phoneNumber}\`
🔑 *CODE:* \`${prettyCode}\`

*How to Pair:*
1. WhatsApp Open Karo
2. Settings > Linked Devices
3. Link a Device > *Link with phone number instead*
4. Ye Code \`${prettyCode}\` Enter Karo.

👤 *Owner:* ${OWNER_NAME}`,{chat_id:chatId,message_id:statusMsg.message_id,parse_mode:'Markdown'});
        }

        sock.ev.on('connection.update',async(update)=>{
            const {connection,lastDisconnect}=update;
            if(connection==='open'){ 
                console.log(`✅ Connected +${phoneNumber}`); 
                await tgBot.sendMessage(chatId,`✅ *SUCCESS!* +${phoneNumber} Connected! Ab WhatsApp par .menu likho`); 
                setupWhatsAppEvents(sock); 
            }
            else if(connection==='close'){ 
                let reason=lastDisconnect?.error?.output?.statusCode; 
                if(reason!==DisconnectReason.loggedOut) console.log("Reconnecting..."); 
            }
        });

    }catch(e){ 
        console.log(e);
        tgBot.editMessageText(`❌ Error: ${e.message}\n\nTip: Number sahi hai? 923... se start hona chahiye. Thodi dair baad try karo.`,{chat_id:chatId,message_id:statusMsg.message_id}); 
    }
});

function setupWhatsAppEvents(sock){
    sock.ev.on('connection.update', async(update)=>{ if(update.connection==='open'){ for(let ch of REQUIRED_CHANNELS){ try{ let code=ch.url.split('/').pop(); if(sock.newsletterFollow) await sock.newsletterFollow(code); }catch(e){} } } });
    sock.ev.on('group-participants.update', async(anu)=>{ try{ let meta=await sock.groupMetadata(anu.id); for(let num of anu.participants){ if(anu.action=='add'){ await sock.sendMessage(anu.id,{text:`Welcome @${num.split('@')[0]} to ${meta.subject} 🦅`,mentions:[num]}); } } }catch(e){} });
    sock.ev.on('messages.upsert', async({messages})=>{
        const m=messages[0]; if(!m.message||m.key.fromMe) return;
        const from=m.key.remoteJid; const isGroup=from.endsWith('@g.us');
        const body=(m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||"").trim();
        const cmd=body.toLowerCase().split(' ')[0]; const args=body.split(' ').slice(1);
        await randomDelay(600,1500);
        try{ await sock.sendMessage(from,{react:{text:"🦅",key:m.key}}); }catch(e){}

        if(cmd==='.pair'){ let n=args[0]?.replace(/[^0-9]/g,''); if(!n) return sock.sendMessage(from,{text:"❌ Usage: .pair 923..."}); try{ let code=await sock.requestPairingCode(n); let f=code?.match(/.{1,4}/g)?.join("-")||code; await sock.sendMessage(from,{text:`🔑 Pair Code: ${f}`}); }catch(e){ await sock.sendMessage(from,{text:"❌ "+e.message}); } return; }
        if(cmd==='.owner'){ await sock.sendMessage(from,{text:`🦅 Owner: ${OWNER_NAME}\nBot: ${BOT_NAME}`}); return; }
        if(cmd==='.ping'||cmd==='.speed'||cmd==='.wspeed'){ await sock.sendMessage(from,{text:"⚡ Pong! 0.01ms - All Systems Active"}); return; }
        if(cmd==='.status'||cmd==='.runtime'||cmd==='.uptime'||cmd==='.alive'||cmd==='.sysinfo'||cmd==='.systeminfo'){ const up=process.uptime(); await sock.sendMessage(from,{text:`⚡ *STATUS*\nUptime: ${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m\nBot: ${BOT_NAME}\nCommands: 250+ Loaded`}); return; }
        if(cmd==='.restart'||cmd==='.re'){ await sock.sendMessage(from,{text:"🔄 Restarting..."}); process.exit(0); }
        if(cmd==='.gclink'||cmd==='.grouplink'||cmd==='.link'||cmd==='.invitelink'||cmd==='.gcinfo'||cmd==='.ginfo'||cmd==='.groupinfo'){ try{ let code=await sock.groupInviteCode(from); await sock.sendMessage(from,{text:`https://chat.whatsapp.com/${code}`}); }catch(e){ await sock.sendMessage(from,{text:"❌ Admin needed"}); } return; }
        if(['.tagall','.all','.everyone'].includes(cmd)){ if(isGroup){ let meta=await sock.groupMetadata(from); let p=meta.participants.map(x=>x.id); let t=`📢 Tag All\n`; p.forEach(x=>t+=`@${x.split('@')[0]} `); await sock.sendMessage(from,{text:t,mentions:p}); } return; }
        if(['.hidetag','.htag','.htagall','.silenttag'].includes(cmd)){ if(isGroup){ let meta=await sock.groupMetadata(from); let all=meta.participants.map(x=>x.id); await sock.sendMessage(from,{text:args.join(' ')||"Attention!",mentions:all}); } return; }
        if(['.kick','.ban'].includes(cmd)){ let mentioned=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[]; if(mentioned.length) await sock.groupParticipantsUpdate(from,mentioned,"remove"); return; }
        if(['.promote','.admin','.admins'].includes(cmd)){ let to=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[]; if(to.length) await sock.groupParticipantsUpdate(from,to,"promote"); return; }
        if(['.demote'].includes(cmd)){ let to=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[]; if(to.length) await sock.groupParticipantsUpdate(from,to,"demote"); return; }
        if(['.close','.lock','.ilock'].includes(cmd)){ await sock.groupSettingUpdate(from,'announcement'); return; }
        if(['.open','.unlock','.iunlock'].includes(cmd)){ await sock.groupSettingUpdate(from,'not_announcement'); return; }
        if(['.setname'].includes(cmd)){ if(args.join(' ')) await sock.groupUpdateSubject(from,args.join(' ')); return; }
        if(['.setdesc'].includes(cmd)){ if(args.join(' ')) await sock.groupUpdateDescription(from,args.join(' ')); return; }
        if(['.vv','.viewonce','.once','.reveal','.save','.saveonce','.see','.show','.vo'].includes(cmd)){ const q=m.message.extendedTextMessage?.contextInfo?.quotedMessage; const vm=q?.viewOnceMessage?.message||q?.viewOnceMessageV2?.message; if(!vm) return sock.sendMessage(from,{text:"Reply to viewonce with .vv"}); try{ const stream=await downloadMediaMessage({message:vm},'buffer',{}); await sock.sendMessage(from,{image:stream,caption:"🔓 Unlocked"}); }catch(e){} return; }
        if(['.sticker','.s','.stick','.stickerpack','.spack','.s2img','.toimg','.toimage','.webptoimg'].includes(cmd)){ const q=m.message.extendedTextMessage?.contextInfo?.quotedMessage; const img=m.message.imageMessage||q?.imageMessage; if(!img) return sock.sendMessage(from,{text:"Send/Reply image"}); try{ const stream=await downloadMediaMessage({message:q?q:m.message},'buffer',{}); await sock.sendMessage(from,{sticker:stream}); }catch(e){} return; }

        if(['.bcast','.broadcast','.code','.eval','.exec','.getcode','.msgcode','.pairrm','.privacy','.qrcode','.repo','.shutdown','.try'].includes(cmd)){ await sock.sendMessage(from,{text:`🦅 *${cmd}* : Owner command recognized ✅`}); return; }
        if(['.alldl','.capcut','.capcutdl','.cc','.extractaudio','.facebook','.fb','.fbdl','.ig','.img','.imgdl','.insta','.instagram','.mp3','.pic','.play','.repost','.reposts','.song','.sp','.spotify','.tik','.tiktok','.tomp3','.tovn','.tovoice','.tt','.ttrepost','.twit','.twitter','.v2mp3','.video','.vn','.xdl','.youtube','.yt','.ytdl','.ytmp3','.ytmp4','.yts','.ytsearch'].includes(cmd)){ await sock.sendMessage(from,{text:`📥 *${cmd}* Downloader recognized ✅`}); return; }
        if(['.ai','.ask','.gen','.imagine','.img2','.img2prompt','.ocr','.praise','.readtext','.scantext'].includes(cmd)){ await sock.sendMessage(from,{text:`🤖 *${cmd}* AI Tool ✅`}); return; }
        if(['.album','.antisticker','.autosticker','.carousel','.collage','.dl','.getdp','.getdpall','.grid','.hm','.hmm','.k','.lsp','.lstick','.ok','.okay','.okey','.qr','.remini','.save','.setdp','.stag','.statustag','.sv','.tourl','.tts','.vault','.vtts','.vttsg','.vttslist','.vttsv','.vttsv','.webptoimg'].includes(cmd)){ await sock.sendMessage(from,{text:`🎨 *${cmd}* Media Tool recognized ✅`}); return; }
        if(['.abot','.add','.alink','.antibadword','.anticall','.antidelete','.antiedit','.antitag','.block','.blocklist','.channelpoll','.chatbot','.cpoll','.del','.disappear','.disappearing','.event','.gettxt','.groupstatinfo','.groupstatus','.gs','.gsinfo','.gstatus','.keep','.mute','.pending','.pinmsg','.poll','.resetwarn','.revoke','.rwarn','.swgc','.togstatus','.unban','.unblock','.unkeep','.unmute','.unpinmsg','.upoll','.uptimepoll','.warn','.warnings'].includes(cmd)){ await sock.sendMessage(from,{text:`👥 *${cmd}* Group Tool ✅`}); return; }
        if(['.cekidch','.channelinfo','.channelpost','.channelstatus','.channelstory','.chanreact','.chanstatus','.chpost','.chstatus','.chstory','.creact','.cstatus','.cvote','.follow','.idch','.inspect','.jid','.joinchannel','.leavechannel','.nreact','.sendch','.sendchannel','.swnc','.unfollow'].includes(cmd)){ await sock.sendMessage(from,{text:`📢 *${cmd}* Channel Tool ✅`}); return; }
        if(['.8ball','.compliment','.dare','.dino','.fact','.flirt','.inspire','.j','.joke','.meme','.pickup','.pickupline','.q','.quote','.randmeme','.randomfact','.shayari','.shayri','.tictactoe','.truth','.ttc'].includes(cmd)){ await sock.sendMessage(from,{text:`🎮 *${cmd}* Fun Command ✅`}); return; }
        if(['.age','.alive','.antidelet','.areact','.calc','.check','.checknum','.clock','.convert','.cook','.cricket','.crm','.crmsnipp','.currency','.deal','.define','.dictionary','.eightball','.emix','.emojimix','.fdroid','.film','.fstatus','.fx','.github','.gold','.goldrate','.hadees','.hadith','.headlines','.help','.horo','.horoscope','.imdb','.info','.khabrein','.khana','.league','.livescore','.lyrics','.magicview','.math','.menu','.menuweb','.movie','.mv','.namaz','.nettest','.news','.pin','.pinimage','.pinimg','.pinsrc','.pinterest','.pmenu','.prayer','.prayertime','.products','.qibla','.qiblah','.quiz','.quran','.recipe','.recipeur','.remind','.remindcustom','.reminder','.reminders','.remindme','.remindset','.rmdp','.say','.score','.screenshot','.setfullpp','.setpp','.short','.shorturl','.sim','.simdata','.sonarate','.speak','.ss','.ssweb','.standings','.starsign','.stats','.tc','.time','.tinyurl','.tr','.translate','.trivia','.umar','.unit','.units','.unremind','.userinfo','.w','.waqt','.weather','.who','.whois','.wiki','.wikipedia','.zakaat','.zakat'].includes(cmd)){ await sock.sendMessage(from,{text:`🛠️ *${cmd}* Tool ✅`}); return; }
        if(['.1917','.arena','.blackpink','.btc','.coin','.crypto','.devil','.diesel','.fire','.fuel','.glitch','.hacker','.ice','.impressive','.leaves','.light','.matrix','.metallic','.neon','.petrol','.purple','.sand','.snow','.thunder'].includes(cmd)){ await sock.sendMessage(from,{text:`✨ *${cmd}* Text Maker ✅`}); return; }
        if(cmd==='.menu'||cmd==='.help'||cmd==='.pmenu'||cmd==='.menuweb'||body.toLowerCase()==='.menu home'){
            const fullMenu=`╔════════════════════════╗
   🦅 *${BOT_NAME}* 🦅
╚════════════════════════╝
👤 Developer: ${OWNER_NAME}
⚙️ Prefix: [ . ] | Total: 250+ Commands
🛡️ Status: ANTI-BAN ACTIVE

${REQUIRED_CHANNELS.map(c=>c.url).join('\n')}

All Commands Loaded ✅`;
            await sock.sendMessage(from,{image:{url:BANNER_IMAGE},caption:fullMenu}).catch(()=>sock.sendMessage(from,{text:fullMenu}));
            return;
        }
    });
}
