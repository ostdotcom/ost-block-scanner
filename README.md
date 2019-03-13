# OST Block Scanner


[![Latest version](https://img.shields.io/npm/v/@ostdotcom/ost-block-scanner.svg?maxAge=3600)][npm]
[![Downloads per month](https://img.shields.io/npm/dm/@ostdotcom/ost-block-scanner.svg?maxAge=3600)][npm]

[npm]: https://www.npmjs.com/package/@ostdotcom/ost-block-scanner
[travis]: https://travis-ci.org/ostdotcom/ost-block-scanner

OST Block Scanner parses Ethereum-based chains and stores data in DynamoDB. It supports multiple chains, as well.


## Install

```bash
  npm install @ostdotcom/ost-block-scanner --save
```

## Setup

### 1. Install Prerequisites 
- [nodejs](https://nodejs.org/) >= 8.0.0
- [Geth](https://github.com/ethereum/go-ethereum/) >=1.8.17
- [Memcached](https://memcached.org/)
- AWS DynamoDB Service OR [DynamoDBLocal.jar](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html)
- [Java](https://www.java.com/) >= 6.0, if using DynamoDBLocal.jar
- [DB Browser for SQLite](https://sqlitebrowser.org/) optionally to browse DynamoDB
    
### 2. Run DynamoDBLocal.jar, if you are not using AWS DynamoDB Service

```bash
  # NOTE: Make sure to change DYNAMODB_PATH
  export DYNAMODB_PATH=~/dynamodb_local_latest
  java -Djava.library.path=$DYNAMODB_PATH/DynamoDBLocal_lib/ -jar $DYNAMODB_PATH/DynamoDBLocal.jar -sharedDb -dbPath $DYNAMODB_PATH/
```

### 3. Create OST Block Scanner config file
Refer to [config.json.example](config.json.example) to create a new configuration file.

Set `CONFIG_STRATEGY_PATH` environment variable to the path of the configuration file just created.

### 4. Create Global DynamoDB tables: 

```bash
  node ./node_modules/@ostdotcom/ost-block-scanner/tools/initialSetup.js --configFile $CONFIG_STRATEGY_PATH
```

#### 5. Add a new chain and create chain-specific shared DynamoDB tables:
  * Mandatory parameters: `chainId`, `networkId`, `configFile`
  * Optional parameters (each defaults to 1):
    * `blockShardCount`: number of block shards to be created
    * `economyShardCount`: number of economy shards to be created
    * `economyAddressShardCount`: number of economy address shards to be created
    * `transactionShardCount`: number of transaction shards to be created
  
```bash
  # NOTE:
  # Make sure chain configuration is present in config file before starting this step. 
  # Optional parameters are used to create entity-specific sharded tables. 
  # By default only one shard is created for each entity. 
  node ./node_modules/@ostdotcom/ost-block-scanner/tools/addChain.js --configFile $CONFIG_STRATEGY_PATH --chainId 2000 --networkId 1 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2
```

### 6. Add additional shards to existing chains (optional)

* Additional block specific data shards:

```bash
  node ./node_modules/@ostdotcom/ost-block-scanner/tools/createShards/byBlock.js --configFile $CONFIG_STRATEGY_PATH --chainId 2000 --shardNumber 1
```

* Additional economy user(s) specific data shards:

```bash
  node ./node_modules/@ostdotcom/ost-block-scanner/tools/createShards/byEconomyAddress.js --configFile $CONFIG_STRATEGY_PATH --chainId 2000 --shardNumber 1
```

* Additional transaction specific data shards:

```bash
  node ./node_modules/@ostdotcom/ost-block-scanner/tools/createShards/byTransaction.js --configFile $CONFIG_STRATEGY_PATH --chainId 2000 --shardNumber 1
```
    
<<<<<<< HEAD
# Start Block Scanner
  * Mandatory parameters: `chainId`, `configFile`
  * Optional parameters: `startBlockNumber`, `endBlockNumber`
=======
## Start Block Scanner
  * Mandatory parameters: chainId, configFile
  * Optional parameters: startBlockNumber, endBlockNumber
>>>>>>> 08bd867... Readme: update headings for accessibility
```bash
  node ./node_modules/@ostdotcom/ost-block-scanner/executables/blockScanner.js --configFile $CONFIG_STRATEGY_PATH --chainId 2000 --startBlockNumber 0 --endBlockNumber 100
```