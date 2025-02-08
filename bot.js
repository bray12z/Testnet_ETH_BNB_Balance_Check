require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Lấy Token & API Key từ biến môi trường
const TOKEN = process.env.BOT_TOKEN;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🚀 Bot Telegram đã khởi động thành công!");

// Giới hạn tốc độ gọi API: 5 requests/second
const RATE_LIMIT = 5;
const REQUEST_DELAY = 1000 / RATE_LIMIT; // 1000ms / 5 = 200ms mỗi request

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Xin chào! Gửi danh sách địa chỉ ví testnet (ETH & BNB) để kiểm tra số dư.\n\n" +
      "📌 Mỗi địa chỉ ví cần cách nhau bằng khoảng trắng hoặc xuống dòng.\n" +
      "Ví dụ:\n" +
      "`0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`\n" +
      "`0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`\n\n" +
      "🚀 Bot sẽ kiểm tra và gửi kết quả lại!"
  );
});

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
    `🔍 Đang kiểm tra số dư của ${walletAddresses.length} địa chỉ ví...\n⏳ Vui lòng đợi...`
  );

  try {
    let results = [];

    for (let i = 0; i < walletAddresses.length; i++) {
      const walletAddress = walletAddresses[i];

      // Gọi API để lấy số dư ETH trên Sepolia Testnet
      const ethPromise = axios.get(
        `https://api-sepolia.etherscan.io/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
      );

      // Gọi API để lấy số dư BNB trên BSC Testnet
      const bnbPromise = axios.get(
        `https://api-testnet.bscscan.com/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${BSCSCAN_API_KEY}`
      );

      // Chờ 2 API cùng trả về dữ liệu
      const [ethBalanceRes, bnbBalanceRes] = await Promise.all([
        ethPromise,
        bnbPromise,
      ]);

      const ethBalance = ethBalanceRes.data.result / 10 ** 18;
      const bnbBalance = bnbBalanceRes.data.result / 10 ** 18;

      results.push(
        `📌 **Ví**: \`${walletAddress}\`\n` +
          `💰 **ETH (Sepolia Testnet)**: ${ethBalance.toFixed(6)} ETH\n` +
          `💰 **BNB (BSC Testnet)**: ${bnbBalance.toFixed(6)} BNB\n`
      );

      // Nếu còn ví để kiểm tra, chờ một chút trước khi gọi tiếp API
      if (i < walletAddresses.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
      }
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
