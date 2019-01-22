# openst-block-scanner
Block scanner for ethereum-based block chains.


## Different shard types
 *  Shared tables:
    * Chain table.
    * Shard table.
    * Economy table.
    * ShardByBlock table.
    * ShardByEconomy table.
    * ShardByEconomyAddress table.
    * ShardByTransaction table.
    
 * Sharded tables:
    * Block table (sharded by block).
    * Economy Address Balance table (sharded by economy). 
    * Economy Address Transaction table (sharded by economy address). 
    * Economy Address Transfer table (sharded by economy address). 
    * Token Transfer table (sharded by transaction). 
    * Transaction table (sharded by transaction). 
        
## Setup openst-block-scanner

* You will need following for development environment setup.
    - [nodejs](https://nodejs.org/) >= 8.0.0
    - [Geth](https://github.com/ethereum/go-ethereum/) >=1.8.17
    - [Memcached](https://memcached.org/)
    - [DB Browser for SQLite](https://sqlitebrowser.org/)

* Run following command to start Dynamo DB.
  ```bash
  > java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib/ -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -dbPath ~/dynamodb_local_latest/
  ```

* Create all the shared tables by running the following script: 
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/tests/data/config.json
    node tools/initialSetup.js --configFile $CONFIG_STRATEGY_PATH
    ```
* Run the addChain service and pass all the necessary parameters:
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/tests/data/config.json
    node tools/addChain.js --chainId 1000 --networkId 1 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2 --configFile $CONFIG_STRATEGY_PATH
    ```
    * Mandatory parameters: chainId, networkId, configFile
    * Optional parameters (defaults to 1): blockShardCount, economyShardCount, economyAddressShardCount, transactionShardCount
    
## Running individual services.

* Add shards for a new chain:
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/config.json
    node tools/addChain.js --chainId 1000 --networkId 1 --blockShardCount 1 --economyShardCount 1 --economyAddressShardCount 1 --transactionShardCount 1 --configFile $CONFIG_STRATEGY_PATH
    ```
* Add block(sharded) shards for existing chain:
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/config.json
    node tools/createShards/byBlock.js --chainId 1000 --shardCount 1 --configFile $CONFIG_STRATEGY_PATH
    ```
* Add chainId shard for existing chain:
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/config.json
    node tools/createShards/byChainId.js --chainId 1000 --configFile $CONFIG_STRATEGY_PATH
    ```
* Add economy(sharded) shards for existing chain:
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/config.json
    node tools/createShards/byEconomy.js --chainId 1000 --shardCount 1 --configFile $CONFIG_STRATEGY_PATH
    ```
* Add economy address(sharded) shards for existing chain:
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/config.json
    node tools/createShards/byEconomyAddress.js --chainId 1000 --shardCount 1 --configFile $CONFIG_STRATEGY_PATH
    ```
* Add transactions(sharded) shards for existing chain:
    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/config.json
    node tools/createShards/byTransaction.js --chainId 1000 --shardCount 1 --configFile $CONFIG_STRATEGY_PATH
    ```
  
## Block Scanner Executable
* Running Block Scanner.

    ```bash
    export CONFIG_STRATEGY_PATH=$(pwd)/config.json
    node executables/blockScanner.js --chainId 1000 --configFile $CONFIG_STRATEGY_PATH --startBlockNumber 0 --endBlockNumber 100
    ```
    
## Running tests
* Start Dynamo

    ```bash
    java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib/ -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -dbPath .
    ```
* Run tests with `npm test`.
