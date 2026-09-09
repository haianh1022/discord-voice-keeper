const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

async function joinRoom() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      console.log("Không tìm thấy Voice Channel hợp lệ hoặc sai ID.");
      return;
    }

    console.log(`Đang gửi yêu cầu vào phòng: ${channel.name}`);

    let connection = getVoiceConnection(channel.guild.id);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true
      });
    }

    connection.on("stateChange", (oldState, newState) => {
      console.log(`Trạng thái voice: ${oldState.status} ➔ ${newState.status}`);
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log("Bot đã vào Voice Channel thành công!");
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log("Bị ngắt kết nối. Đang thử kết nối lại...");
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
        ]);
      } catch {
        try { connection.destroy(); } catch {}
        setTimeout(joinRoom, 5_000);
      }
    });

  } catch (error) {
    console.error("Lỗi kết nối:", error.message);
    setTimeout(joinRoom, 5_000);
  }
}

client.once("clientReady", async () => {
  console.log(`Bot đã online: ${client.user.tag}`);
  await joinRoom();
});

if (!TOKEN || !CHANNEL_ID) {
  console.log("Thiếu DISCORD_TOKEN hoặc CHANNEL_ID.");
  process.exit(1);
}

client.login(TOKEN);