module.exports = {
    default: {
        deployment: {
            host: "localhost",
            port: 8546,
            type: "ws",
            accounts: [
                {
                    privateKey: "random",
                    balance: "1000 ether"
                },
                {
                    privateKey: "random",
                    balance: "1000 ether"
                },
                {
                    privateKey: "random",
                    balance: "1000 ether"
                },
                {
                    privateKey: "random",
                    balance: "1000 ether"
                },
            ]
        },
        dappConnection: [
            "$WEB3",
            "ws://localhost:8546",
            "http://localhost:8545"
        ],
        gas: "auto",
        contracts: {}
    },

    development: {
        dappConnection: [
            "ws://localhost:8546",
            "http://localhost:8545",
            "$WEB3"
        ]
    },

    privatenet: {},

    testnet: {},

    livenet: {},
};
