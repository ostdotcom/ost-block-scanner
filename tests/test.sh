#!/bin/bash

# Get test data
if [ ! -d "$PWD/tests/data/geth" ]; then
  wget https://s3.amazonaws.com/gethdummy/data+\(2\).zip -O ./tests/data.zip
  unzip ./tests/data.zip -d tests/
fi

#Create shards
node tools/initialSetup.js --configFile $PWD'/tests/data/config.json'
node tools/AddChain.js --chainId 1000 --networkId 1 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2 --configFile $PWD'/tests/data/config.json'

#start chain
bash tests/data/geth/run-utility.sh &

sleep 10

# Run tests in order

mocha tests/parser/checkBlockDetails.js --timeout 4000 --exit
mocha tests/parser/blockParserPositive.js --timeout 1500 --exit
mocha tests/parser/blockParserNegative.js --timeout 1500 --exit

node executables/blockScanner.js --chainId 1000 --configFile $(pwd)/config.json --startBlockNumber 6 --endBlockNumber 135

mocha tests/parser/transactionParser.js --timeout 4000 --exit
mocha tests/parser/tokenTransferParser.js --timeout 4000 --exit

#mocha tests/parser/checkBalances.js --timeout 4000 --exit

# Delete compressed geth data file
rm tests/data.zip

# Kill geth
ps aux | grep geth | grep -v grep | tr -s ' ' | cut -d ' ' -f2 | xargs kill -9


# Open below lines to run test cases in local repeatedly

kill $(ps aux | grep 'geth' | awk '{print $2}')
kill $(ps aux | grep 'DynamoDBLocal.jar' | awk '{print $2}')
rm shared-local-instance.db
