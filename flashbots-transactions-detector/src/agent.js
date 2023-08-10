const {
  Finding,
  FindingSeverity,
  FindingType,
  getTransactionReceipt,
  Label,
  EntityType,
  getEthersProvider,
} = require("forta-agent");
const { PersistenceHelper } = require("./persistence.helper");
const { default: axios } = require("axios");

const flashbotsUrl = "https://blocks.flashbots.net/v1/blocks?limit=4";
let lastBlockNumber = 0;

const DATABASE_URL = "https://research.forta.network/database/bot/";

const FLASHBOTS_TXS_KEY = "nm-flashbots-bot-txs-key";
const TOTAL_TXS_KEY = "nm-flashbots-bot-total-txs-key";

let totalFlashbotsTxns = 0;
let totalTxns = 0;

function provideInitialize(persistenceHelper, flashbotsKey, totalTxnsKey) {
  return async () => {
    totalFlashbotsTxns = await persistenceHelper.load(flashbotsKey);
    totalTxns = await persistenceHelper.load(totalTxnsKey);
  };
}

function provideHandleBlock(provider, getTransactionReceipt, persistenceHelper, flashbotsKey, totalTxnsKey) {
  let cachedFindings = [];
  return async (blockEvent) => {
    const numberOfTransactions = blockEvent.block.transactions.length;
    totalTxns += numberOfTransactions;

    if (cachedFindings.length >= 10) {
      cachedFindings.splice(0, 10);
    } else {
      cachedFindings = [];
    }
    let result;
    try {
      result = await axios.get(flashbotsUrl);
    } catch (e) {
      console.log("Error:", e.code);
      return [];
    }

    const { blocks } = result.data;

    // Get findings for every new flashbots block and combine them
    let findings = await Promise.all(
      blocks.map(async (block) => {
        const { transactions, block_number: blockNumber } = block;
        let currentBlockFindings;

        // Only process blocks that aren't processed
        if (blockNumber > lastBlockNumber) {
          // Create finding for every flashbots transaction in the block
          currentBlockFindings = await Promise.all(
            transactions
              .filter((transaction) => transaction.bundle_type !== "mempool")
              .filter(async (transaction) => {
                const code = await provider.getCode(transaction.to_address);
                return code !== "0x";
              })
              .map(async (transaction) => {
                const { eoa_address: from, to_address: to, transaction_hash: hash } = transaction;

                // Use the tx logs to get the impacted contracts
                const { logs } = await getTransactionReceipt(hash);
                let alertId = "FLASHBOTS-TRANSACTIONS";

                let addresses = logs.map((log) => {
                  // Check if the transaction is a swap
                  // 0xd78ad95... is the swap topic for Uniswap v2 & 0xc42079f... is the swap topic for Uniswap v3
                  if (
                    log.topics.includes("0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822") ||
                    log.topics.includes("0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67")
                  ) {
                    alertId = "FLASHBOTS-SWAP-TRANSACTIONS";
                  }
                  return log.address.toLowerCase();
                });

                addresses = [...new Set(addresses)];

                return Finding.fromObject({
                  name: "Flashbots transactions",
                  description: `${from} interacted with ${to} in a flashbots transaction`,
                  alertId: alertId,
                  severity: FindingSeverity.Low,
                  type: FindingType.Info,
                  addresses,
                  metadata: {
                    from,
                    to,
                    hash,
                    blockNumber,
                  },
                  labels: [
                    Label.fromObject({
                      entity: from,
                      entityType: EntityType.Address,
                      label: "Attacker",
                      confidence: 0.6,
                    }),
                    Label.fromObject({
                      entity: hash,
                      entityType: EntityType.Transaction,
                      label: "Suspicious",
                      confidence: 0.7,
                    }),
                  ],
                });
              })
          );

          lastBlockNumber = blockNumber;
        }

        return currentBlockFindings;
      })
    );

    findings = findings.flat().filter((f) => !!f);

    findings.map((f) => {
      totalFlashbotsTxns += 1;
      const anomalyScore = totalFlashbotsTxns / totalTxns;
      f.metadata.anomalyScore =
        Math.min(1, anomalyScore).toFixed(2) === "0.00"
          ? Math.min(1, anomalyScore).toString()
          : Math.min(1, anomalyScore).toFixed(2);
    });

    cachedFindings.push(...findings);

    if (blockEvent.blockNumber % 240 === 0) {
      await persistenceHelper.persist(totalFlashbotsTxns, flashbotsKey);
      await persistenceHelper.persist(totalTxns, totalTxnsKey);
    }

    return cachedFindings.slice(0, 10);
  };
}

module.exports = {
  provideHandleBlock,
  handleBlock: provideHandleBlock(
    getEthersProvider(),
    getTransactionReceipt,
    new PersistenceHelper(DATABASE_URL),
    FLASHBOTS_TXS_KEY,
    TOTAL_TXS_KEY
  ),
  provideInitialize,
  initialize: provideInitialize(new PersistenceHelper(DATABASE_URL), FLASHBOTS_TXS_KEY, TOTAL_TXS_KEY),
  resetLastBlockNumber: () => {
    lastBlockNumber = 0;
  }, // Exported for unit tests
};
