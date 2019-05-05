module.exports = {
    default: {
        deployment: {
            host: "localhost",
            port: 8546,
            type: "ws"
        },
        dappConnection: [
            "$WEB3",
            "ws://localhost:8546",
            "http://localhost:8545"
        ],
        gas: "auto"
    },

    development: {
        isDev: true,
        dappConnection: [
            "ws://localhost:8546",
            "http://localhost:8545",
            "$WEB3"
        ],
        contracts: {
            Remittance: {
                args: ['$accounts[0]', "1234", "4567"]
            }
        }
    },

    privatenet: {},

    testnet: {},

    livenet: {},
};
