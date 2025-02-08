require("dotenv").config(); // Đọc biến môi trường từ file .env
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Lấy Token & API Key từ .env
const TOKEN = process.env.BOT_TOKEN;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;

const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🚀 Bot Telegram đã khởi động thành công!");

// Xử lý lỗi Polling
bot.on("polling_error", (error) => {
  console.error(`❌ Lỗi Polling: ${error.message}`);
});

// Khi người dùng gửi /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Xin chào! Gửi danh sách địa chỉ ví testnet (ETH & BNB) để kiểm tra số dư.\n\n" +
      "📌 Mỗi địa chỉ ví cần cách nhau bằng khoảng trắng hoặc xuống dòng.\n" +
      "Ví dụ:\n" +
      "`0x7f172cbba9bcba784d7b2aef7bfe80c1fda0fa8b`\n" +
      "`0x7df97f15ab94e72084ce7ba6ce22c5ed9223e35b`\n\n" +
      "🚀 Bot sẽ kiểm tra và gửi kết quả lại!"
  );
});

// Xử lý tin nhắn người dùng
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Nếu tin nhắn là lệnh, bỏ qua
  if (text.startsWith("/")) return;

  // Tách nhiều địa chỉ ví bằng dấu xuống dòng hoặc khoảng trắng
  let walletAddresses = text
    .split(/\s+|\n+/)
    .filter((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr));

  if (walletAddresses.length === 0) {
    bot.sendMessage(
      chatId,
      "⚠️ Không tìm thấy địa chỉ ví hợp lệ. Hãy gửi danh sách địa chỉ Ethereum/BSC hợp lệ!"
    );
    return;
  }

  bot.sendMessage(
    chatId,
    `🔍 Đang kiểm tra số dư của ${walletAddresses.length} địa chỉ ví...`
  );

  try {
    let results = [];

    for (const walletAddress of walletAddresses) {
      const [ethBalanceRes, bnbBalanceRes] = await Promise.all([
        axios.get(
          `https://api-sepolia.etherscan.io/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
        ),
        axios.get(
          `https://api-testnet.bscscan.com/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${BSCSCAN_API_KEY}`
        ),
      ]);

      const ethBalance = (ethBalanceRes.data.result || 0) / 10 ** 18;
      const bnbBalance = (bnbBalanceRes.data.result || 0) / 10 ** 18;

      results.push(
        `📌 **Ví**: \`${walletAddress}\`\n` +
          `💰 **ETH (Sepolia Testnet)**: ${ethBalance.toFixed(6)} ETH\n` +
          `💰 **BNB (BSC Testnet)**: ${bnbBalance.toFixed(6)} BNB\n`
      );
    }

    // Gửi kết quả về Telegram (chia thành nhiều tin nhắn nếu cần)
    const messageChunks = splitMessage(results.join("\n"), 4000);
    for (const chunk of messageChunks) {
      bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error("❌ Lỗi API:", error);
    bot.sendMessage(chatId, `❌ Lỗi khi lấy số dư: ${error.message}`);
  }
});

// Hàm chia nhỏ tin nhắn (do Telegram giới hạn 4096 ký tự)
function splitMessage(text, maxLength) {
  const chunks = [];
  while (text.length > maxLength) {
    let splitIndex = text.lastIndexOf("\n", maxLength);
    if (splitIndex === -1) splitIndex = maxLength;
    chunks.push(text.slice(0, splitIndex));
    text = text.slice(splitIndex);
  }
  chunks.push(text);
  return chunks;
}
