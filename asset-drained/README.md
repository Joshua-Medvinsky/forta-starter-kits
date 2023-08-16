# Asset Drained Bot

## Description

This bot detects if a contract has had 99% or more of one of its assets drained within a block. It monitors ERC20 and native tokens transfers from contracts and raises an alert when a contract has its balance decreased by 99% or more from one block to the next. An alert is triggered if the value lost is either above the USD threshold (i.e., $10,000) or exceeds 5% of the token's total supply."

## Supported Chains

- Ethereum
- Optimism
- BNB Smart Chain
- Polygon
- Fantom
- Arbitrum
- Avalanche

## Alerts

- ASSET-DRAINED

  - Fired when a contract has had 99% or more of one of its assets drained
  - Severity is always set to "high"
  - Type is always set to "suspicious"
  - Metadata:
    - `contract` - the contract's address
    - `asset` - the asset's address
    - `initiators` - the EOA(s) that initiated the transaction(s)
    - `preDrainBalance` - the pre-drain balance
    - `postDrainBalance` - the post-drain balance
    - `txHashes` - the hash(es) of the transaction(s) in which the contract was drained
    - `blockNumber` - the block number at the time of the contract drain
    - `anomalyScore` - score of how anomalous the alert is (0-1)
      - Score calculated by finding amount of `ASSET-DRAINED` transactions out of the total number of ERC20 transfers processed by this bot.
        - Note: score differs based on chain.
  - Labels:
    - Label 1:
      - `entityType`: The type of the entity, always set to "Address"
      - `entity`: The victim's address
      - `label`: The type of the label, always set to "Victim"
      - `confidence`: The confidence level of the address being a victim (0-1). Always set to `1`.
    - Label 2:
      - `entityType`: The type of the entity, always set to "Address"
      - `entity`: The initiator EOA's address
      - `label`: The type of the label, always set to "Attacker"
      - `confidence`: The confidence level of the address being a victim (0-1). Always set to `0.5`.
  - Addresses contain the list of addresses that received the assets from the drained contract

- ASSET-DRAINED-LIQUIDITY-REMOVAL
  - Fired when a contract has had 99% or more of one of its assets drained by _liquidity removal_
  - Severity is always set to "high"
  - Type is always set to "suspicious"
  - Metadata:
    - `contract` - the contract's address
    - `asset` - the asset's address
    - `initiators` - the EOA(s) that initiated the transaction(s)
    - `preDrainBalance` - the pre-drain balance
    - `postDrainBalance` - the post-drain balance
    - `txHashes` - the hash(es) of the transaction(s) in which the contract was drained
    - `blockNumber` - the block number at the time of the contract drain
    - `anomalyScore` - score of how anomalous the alert is (0-1)
      - Score calculated by finding amount of `ASSET-DRAINED` transactions out of the total number of ERC20 transfers processed by this bot.
        - Note: score differs based on chain.
  - Labels:
    - Label 1:
      - `entityType`: The type of the entity, always set to "Address"
      - `entity`: The victim's address
      - `label`: The type of the label, always set to "Victim"
      - `confidence`: The confidence level of the address being a victim (0-1). Always set to `1`.
    - Label 2:
      - `entityType`: The type of the entity, always set to "Address"
      - `entity`: The initiator EOA's address
      - `label`: The type of the label, always set to "Attacker"
      - `confidence`: The confidence level of the address being a victim (0-1). Always set to `0.5`.
  - Addresses contain the list of addresses that received the assets from the drained contract

## Test Data

### Ethereum Mainnet

The bot behaviour can be verified by running:

- `npm run block 13499798,13499799` (CREAM exploit).
- `npm run block 15572488,15572489` (WinterMute exploit).
- `npm run block 15794364,15794365` (OlympusDAO exploit).

### BNB Smart Chain

- `npm run block 30235565,30235566` (Liquidity Removal Alert)

Every block we process the transactions from the previous one so when testing you should provide the exploit block and the next one.
