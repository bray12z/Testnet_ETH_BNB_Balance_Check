Here are instruction:
name: Check_testnet_Balance_Nodejs
ver: v1.0
author: Duong Pham
--------
I. Requires:
- install libs by runing: "npm install axios cheerio"
II. How it work
1. Pasting wallet addresses in input.txt file.
2. Run:
    2.1 "node fetch_eth_balance.js" to check testnet ETH balance.
    2.2 "fetch_eth_bsc_balance_output_zero.js" to check testnet ETH & BNB balance, 
        if any wallet address has zero balance, there is a output file that record the address/