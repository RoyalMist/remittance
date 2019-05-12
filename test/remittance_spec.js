const Remittance = require('Embark/contracts/Remittance');
const BN = web3.utils.BN;

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
    this.timeout(10000);

    /************************************************************************************************************
     * Hashing
     ***********************************************************************************************************/

    it("should hash the given input", async function () {
        let hash1 = await Remittance.methods.hash(web3.utils.utf8ToHex("Hello")).call();
        let hash2 = await Remittance.methods.hash(web3.utils.utf8ToHex("Helli")).call();
        assert.notEqual(hash1, hash2, "Hello & Helli should not output the same hash");
        let hash3 = await Remittance.methods.hash(web3.utils.utf8ToHex("Hello")).call();
        assert.strictEqual(hash1, hash3, "Calling the hash function with the same input should output consistent results");
    });

    /************************************************************************************************************
     * Init transaction
     ***********************************************************************************************************/

    it("should fail to init transaction without being the owner of the contract", async function () {
        let message = "";
        try {
            await Remittance.methods.initTransaction(accounts[1], web3.utils.utf8ToHex("Password")).send({
                from: accounts[1],
                value: 100
            });
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("revert"));
    });

    it("should fail to init transaction with no amount", async function () {
        let message = "";
        try {
            await Remittance.methods.initTransaction(accounts[1], web3.utils.utf8ToHex("Password")).send({
                from: accounts[0],
                value: 0
            });
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("Please provide a valid exchange address and a deposit greater than 0"));
    });

    it("should fail to init transaction with an incorrect address", async function () {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        let message = "";
        try {
            await Remittance.methods.initTransaction(zeroAddress, web3.utils.utf8ToHex("Password")).send({
                from: accounts[0],
                value: 10
            });
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("Please provide a valid exchange address and a deposit greater than 0"));
    });

    it("should fail to init transaction with an already set password", async function () {
        let message = "";
        await Remittance.methods.initTransaction(accounts[1], web3.utils.utf8ToHex("1234")).send({
            from: accounts[0],
            value: 10
        });
        try {
            await Remittance.methods.initTransaction(accounts[1], web3.utils.utf8ToHex("1234")).send({
                from: accounts[0],
                value: 10
            });
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("This password is already used"));
    });

    it("should emit an event and store the right information in storage", async function () {
        const currentBalance = new BN(await web3.eth.getBalance(Remittance.address));
        let tx = await Remittance.methods.initTransaction(accounts[1], web3.utils.utf8ToHex("p@ssw0rd")).send({
            from: accounts[0],
            value: 10000
        });

        const theoreticalBalance = currentBalance.add(new BN(10000));
        assert.equal(await web3.eth.getBalance(Remittance.address), theoreticalBalance.toString(), "The contract should have been granted 10000 wei");

        assert.strictEqual(Object.keys(tx.events).length, 1, "1 event should be emitted");
        const event = tx.events.LogInitTransaction;
        assert.equal(event.returnValues.initiator, accounts[0], "Initiator should be the first account");
        assert.equal(event.returnValues.exchange, accounts[1], "Exchange should the second account");
        assert.equal(event.returnValues.howMuch, 10000, "How much should represents the value we put");
    });
});
