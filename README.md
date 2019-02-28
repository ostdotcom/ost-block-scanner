# OST Block Scanner


![Latest version](https://img.shields.io/npm/v/@ostdotcom/ost-block-scanner.svg?maxAge=3600)
![Downloads per month](https://img.shields.io/npm/dm/@ostdotcom/ost-block-scanner.svg?maxAge=3600)

OST Block Scanner parse Ethereum based chains and store data in DynamoDB. It supports multiple chains as well.


# Install

```bash
  npm install @ostdotcom/ost-block-scanner --save
```

# Setup

#### 1. Install Prerequisites 
- [nodejs](https://nodejs.org/) >= 8.0.0
- [Geth](https://github.com/ethereum/go-ethereum/) >=1.8.17
- [Memcached](https://memcached.org/)
- AWS DynamoDB Service OR [DynamoDBLocal.jar](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html)
- [DB Browser for SQLite](https://sqlitebrowser.org/) optionally to browse DynamoDB
    
#### 2. Run DynamoDBLocal.jar, if you are not using AWS DynamoDB Service

```bash
  # NOTE: Make sure to change DYNAMODB_PATH
  export DYNAMODB_PATH=~/dynamodb_local_latest
  java -Djava.library.path=$DYNAMODB_PATH/DynamoDBLocal_lib/ -jar $DYNAMODB_PATH/DynamoDBLocal.jar -sharedDb -dbPath $DYNAMODB_PATH/
```

#### 3. Create OST Block Scanner config file 
Refer ./node_modules/@ostdotcom/ost-block-scanner/config.json.example to create a new configuration file. 
Also set CONFIG_STRATEGY_PATH environment variable

#### 4. Create Global DynamoDB tables: 

```bash
  node ./node_modules/@ostdotcom/ost-block-scanner/tools/initialSetup.js --configFile $CONFIG_STRATEGY_PATH
```

#### 5. Add a new Chain and create chain specific shared DynamoDB tables:
  * Mandatory parameters: chainId, networkId, configFile
  * Optional parameters (defaults to 1): blockShardCount, economyShardCount, economyAddressShardCount, transactionShardCount
  
```bash
  # NOTE:
  # Make sure chain configuration is already present in config file, before starting this step. 
  # Optional parameters are used to create entity specific sharded tables. 
  # By default only one shard is created for each entity. 
  node ./node_modules/@ostdotcom/ost-block-scanner/tools/addChain.js --configFile $CONFIG_STRATEGY_PATH --chainId 2000 --networkId 1 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2
```

#### How to add additional shards to existing chains?

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
    
# Start Block Scanner
  * Mandatory parameters: chainId, configFile
  * Optional parameters: startBlockNumber, endBlockNumber
```bash
  node ./node_modules/@ostdotcom/ost-block-scanner/executables/blockScanner.js --configFile $CONFIG_STRATEGY_PATH --chainId 2000 --startBlockNumber 0 --endBlockNumber 100
```