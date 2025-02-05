const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

// Đọc các địa chỉ ví từ file input.txt
const addresses = fs
  .readFileSync("input.txt", "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "");

async function getBalance(address) {
  const url = `https://sepolia.etherscan.io/address/${address}`;

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const balanceText = $("#ContentPlaceHolder1_divSummary span")
      .filter(function () {
        return $(this).text().includes("ETH");
      })
      .first()
      .text()
      .trim();

    return { address, balance: balanceText || "Balance not found" };
  } catch (error) {
    throw new Error(`Failed to fetch data for ${address}: ${error.message}`);
  }
}

(async () => {
  for (const address of addresses) {
    try {
      const result = await getBalance(address);
      console.log(`Address: ${result.address} - Balance: ${result.balance}`);
    } catch (error) {
      console.error(error.message);
    }
  }
})();
