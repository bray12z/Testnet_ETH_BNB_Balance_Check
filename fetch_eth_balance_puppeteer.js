const fs = require("fs");
const puppeteer = require("puppeteer");

// Đọc các địa chỉ ví từ file input.txt
const addresses = fs
  .readFileSync("input.txt", "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "");

async function getBalance(address) {
  const url = `https://sepolia.etherscan.io/address/${address}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Chờ selector chứa số dư ETH
    await page.waitForSelector("#ContentPlaceHolder1_divSummary span", {
      timeout: 60000,
    });

    const balanceText = await page.$$eval(
      "#ContentPlaceHolder1_divSummary span",
      (spans) => {
        const balanceSpan = spans.find((span) =>
          span.textContent.includes("ETH")
        );
        return balanceSpan
          ? balanceSpan.textContent.trim()
          : "Balance not found";
      }
    );

    await browser.close();
    return { address, balance: balanceText };
  } catch (error) {
    await browser.close();
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
