case 'csong': {
    const fetch = require('node-fetch');
    const yts = require('yt-search');
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { exec } = require('child_process');

    socket.sendMessage(sender, { react: { text: '🎵', key: msg.key } });

    if (!text) return m.reply("❗ Example: .csong <channelJid> <song name>");
    
    let args = text.split(" ");
    let channelJid = args[0];
    let query = args.slice(1).join(" ");

    if (!channelJid.includes("@")) return m.reply("❗ Please provide a valid channel JID.");
    if (!query) return m.reply("❗ Please enter the song name.");

    try {
        // 🔍 Search YouTube
        const search = await yts(query);
        if (!search.videos.length) return m.reply("❌ No results found on YouTube.");
        
        const video = search.videos[0];
        const videoUrl = video.url;
        const duration = video.timestamp;

        // ─────────────── New API ───────────────
        const apiUrl = `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(videoUrl)}&format=audio`;
        const res = await fetch(apiUrl);
        const json = await res.json();

        if (!json?.status || !json?.results?.success || !json?.results?.recommended?.dlurl) {
            return socket.sendMessage(sender, { text: '❌ API did not return a valid download link' }, { quoted: msg });
        }

        const dlUrl = json.results.recommended.dlurl;
        const title = json.results.title || video.title || "Unknown Title";
        let thumb = json.results.thumb || video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

        // Download MP3 to temp file (still needed for Opus conversion)
        const mp3Response = await axios.get(dlUrl, { responseType: 'arraybuffer' });
        const tempMp3 = path.join(os.tmpdir(), `${Date.now()}_input.mp3`);
        fs.writeFileSync(tempMp3, Buffer.from(mp3Response.data));

        // Convert to Opus/OGG (kept your original voice-note style)
        const tempOpus = path.join(os.tmpdir(), `${Date.now()}_output.opus`);
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i "${tempMp3}" -c:a libopus -b:a 128k -vbr on -compression_level 10 "${tempOpus}"`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const opusBuffer = fs.readFileSync(tempOpus);

        // Optional: better thumbnail buffer
        let thumbBuffer = null;
        try {
            const thumbRes = await axios.get(thumb, { responseType: 'arraybuffer' });
            thumbBuffer = Buffer.from(thumbRes.data);
        } catch {}

        // Caption (your original beautiful styling)
        const caption = `*🪸 Simple Wa - Bot!!*

> _*🧃Title*_ : \`${title}\`
> _*🪺 Duration*_ : \`${duration}\`
> _*Thnk For Check Our Bot!! 😌✨*_`;

        // 1. Send preview image + caption to channel
        await socket.sendMessage(channelJid, {
            image: thumbBuffer || { url: thumb },
            caption: caption,
            jpegThumbnail: thumbBuffer || undefined
        });

        // 2. Send Opus audio (voice-note style + externalAdReply)
       await socket.sendMessage(channelJid, {
    audio: opusBuffer,
    mimetype: "audio/ogg; codecs=opus",
    ptt: true,
    fileName: `${title}.opus`
});

        // Cleanup
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
        if (fs.existsSync(tempOpus)) fs.unlinkSync(tempOpus);

        m.reply("✅ Sent to channel successfully! (playable Opus audio)");

    } catch (error) {
        console.error(error);
        m.reply("⚠️ Error: " + (error.message || "unknown error"));
    }
    break;
}
