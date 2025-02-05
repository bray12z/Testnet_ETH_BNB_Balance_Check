const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

// Đọc các địa chỉ ví từ file input.txt
const addresses = fs
  .readFileSync("input.txt", "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "");

let zeroBalances = [];

async function getBalanceEtherscan(address) {
  const url = `https://sepolia.etherscan.io/address/${address}`;
  return await fetchBalance(url, address, "ETH");
}

async function getBalanceBscscan(address) {
  const url = `https://testnet.bscscan.com/address/${address}`;
  return await fetchBalance(url, address, "BNB");
}

async function fetchBalance(url, address, currency) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const balanceText = $("#ContentPlaceHolder1_divSummary span")
      .filter(function () {
        return $(this).text().includes(currency);
      })
      .first()
      .text()
      .trim();

    const balanceValue = parseFloat(balanceText.split(" ")[0]);

    if (balanceValue === 0) {
      zeroBalances.push({
        address,
        network: currency === "ETH" ? "Etherscan" : "Bscscan",
      });
    }

    return {
      address,
      balance: balanceText || "Balance not found",
      network: currency === "ETH" ? "Etherscan" : "Bscscan",
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch data for ${address} on ${
        currency === "ETH" ? "Etherscan" : "Bscscan"
      }: ${error.message}`
    );
  }
}

(async () => {
  for (const address of addresses) {
    try {
      const ethResult = await getBalanceEtherscan(address);
      console.log(
        `Address: ${ethResult.address} - Network: ${ethResult.network} - Balance: ${ethResult.balance}`
      );

      const bnbResult = await getBalanceBscscan(address);
      console.log(
        `Address: ${bnbResult.address} - Network: ${bnbResult.network} - Balance: ${bnbResult.balance}`
      );
    } catch (error) {
      console.error(error.message);
    }
  }

  // Ghi các địa chỉ có số dư bằng 0 vào file output.txt
  const outputData = zeroBalances
    .map((item) => `Address: ${item.address} - Network: ${item.network}`)
    .join("\n");
  fs.writeFileSync("output.txt", outputData, "utf-8");

  console.log("Đã lưu các địa chỉ có số dư bằng 0 vào output.txt");
})();
