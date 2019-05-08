const Remittance = require('Embark/contracts/Remittance');

let accounts;
config({
    deployment: {
        accounts: [
            {
                privateKey: 'random',
                balance: '100 ether'
            },
            {
                privateKey: 'random',
                balance: '100 ether'
            }
        ]
    },
    contracts: {
        Remittance: {}
    }
}, (_err, _accounts) => {
    accounts = _accounts
});

contract("Remittance", function () {
    this.timeout(0);

    it("should be ok", async function () {
        console.log(accounts);
        //let result = await SimpleStorage.methods.storedData().call();
        //assert.strictEqual(parseInt(result, 10), 100);
    });
});
