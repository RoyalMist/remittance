const Remittance = require('Embark/contracts/Remittance');
const BN = require('big-number');

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
            },
            {
                privateKey: 'random',
                balance: '100 ether'
            }
        ]
    }
}, (_err, _accounts) => {
    accounts = _accounts
});

contract("Remittance", function () {
    let RemittanceInstance;

    beforeEach('setup contract for each test', async function () {
        RemittanceInstance = await Remittance.deploy().send({from: accounts[0]});
    });

    /************************************************************************************************************
     * Hashing
     ***********************************************************************************************************/

    it("should hash the given input", async function () {
        let hash1 = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Hello")).call();
        let hash2 = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Helli")).call();
        assert.notEqual(hash1, hash2, "Hello & Helli should not output the same hash");
        let hash3 = await RemittanceInstance.methods.hash(accounts[2], web3.utils.utf8ToHex("Hello")).call();
        assert.notEqual(hash1, hash3, "Hello & Hello with different salt should not output the same hash");
        let hash4 = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Hello")).call();
        assert.strictEqual(hash1, hash4, "Calling the hash function with the same input should output consistent results");
    });

    /************************************************************************************************************
     * Init transaction
     ***********************************************************************************************************/

    it("should fail to init transaction when paused", async function () {
        let message = "";
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Password")).call();
        await RemittanceInstance.methods.pause().send({from: accounts[0]});
        try {
            await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
                from: accounts[0],
                value: 100
            });
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("revert"));
    });

    it("should fail to init transaction with no amount", async function () {
        let message = "";
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Password")).call();
        try {
            await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
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
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Password")).call();
        let message = "";
        try {
            await RemittanceInstance.methods.initTransaction(zeroAddress, hash).send({
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
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("1234")).call();
        await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10
        });
        try {
            await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
                from: accounts[0],
                value: 10
            });
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("This password is already used"));
    });

    it("should deplete the sent amount to the owner", async function () {
        let theoreticalBalance = new BN(await web3.eth.getBalance(accounts[0]));
        const gasPrice = 50;
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Password")).call();
        let rcpt = await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000,
            gasPrice: gasPrice
        });

        theoreticalBalance = theoreticalBalance.minus(rcpt.gasUsed * gasPrice);
        theoreticalBalance = theoreticalBalance.minus(10000);
        assert.equal(await web3.eth.getBalance(accounts[0]), theoreticalBalance.toString(), "The contract should have sent 10000 wei and paid the transaction fees");
    });

    it("should emit an event and store the right information in storage", async function () {
        const currentBalance = new BN(await web3.eth.getBalance(RemittanceInstance.options.address));
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Password")).call();
        let rcpt = await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000
        });

        const theoreticalBalance = currentBalance.add(new BN(10000));
        assert.equal(await web3.eth.getBalance(RemittanceInstance.options.address), theoreticalBalance.toString(), "The contract should have been granted 10000 wei");

        assert.strictEqual(Object.keys(rcpt.events).length, 1, "1 event should be emitted");
        const event = rcpt.events.LogInitTransaction;
        assert.equal(event.returnValues.initiator, accounts[0], "Initiator should be the first account");
        assert.equal(event.returnValues.exchange, accounts[1], "Exchange should the second account");
        assert.equal(event.returnValues.howMuch, 10000, "How much should represents the value we put");
    });

    /************************************************************************************************************
     * Cancel transaction
     ***********************************************************************************************************/

    it("should be impossible to cancel when paused", async function () {
        let message = "";
        await RemittanceInstance.methods.pause().send({from: accounts[0]});
        try {
            await RemittanceInstance.methods.cancelTransaction(accounts[1], web3.utils.utf8ToHex("*")).send({from: accounts[0]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("revert"));
    });

    it("should be impossible to cancel a transaction you do not initiated", async function () {
        let message = "";
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Password")).call();
        await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000
        });

        try {
            await RemittanceInstance.methods.cancelTransaction(accounts[1], web3.utils.utf8ToHex("Password")).send({from: accounts[2]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("You are not the initiator of this transaction"));
    });

    it("should be impossible to cancel a transaction with the wrong password", async function () {
        let message = "";
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Password")).call();
        await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000
        });

        try {
            await RemittanceInstance.methods.cancelTransaction(accounts[1], web3.utils.utf8ToHex("*")).send({from: accounts[0]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("Wrong password or not existing transaction"));
    });

    it("should permit to cancel only once by the rightful people", async function () {
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("MyFi@tPwd")).call();
        const gasPrice = 50;

        await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000
        });

        let theoreticalInitiatorBalance = new BN(await web3.eth.getBalance(accounts[0]));
        let rcpt = await RemittanceInstance.methods.cancelTransaction(accounts[1], web3.utils.utf8ToHex("MyFi@tPwd")).send({
            from: accounts[0],
            gasPrice: gasPrice
        });

        theoreticalInitiatorBalance = theoreticalInitiatorBalance.minus(rcpt.gasUsed * gasPrice);
        theoreticalInitiatorBalance = theoreticalInitiatorBalance.add(10000);
        assert.equal(await web3.eth.getBalance(accounts[0]), theoreticalInitiatorBalance.toString(), "The amount of the exchange account should have been upgraded");

        assert.strictEqual(Object.keys(rcpt.events).length, 1, "1 event should be emitted");
        const event = rcpt.events.LogCancelTransaction;
        assert.equal(event.returnValues.initiator, accounts[0], "Initiator should be the initiator of the transaction");
        assert.equal(event.returnValues.exchange, accounts[1], "Exchange should be the second account");
        assert.equal(event.returnValues.howMuch, 10000, "How much should represents the value we put in init transaction");

        let message = "";
        try {
            await RemittanceInstance.methods.cancelTransaction(accounts[1], web3.utils.utf8ToHex("MyFi@tPwd")).send({from: accounts[0]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("Wrong password or not existing transaction"));
    });

    /************************************************************************************************************
     * Withdraw
     ***********************************************************************************************************/

    it("should be impossible to withdraw when paused", async function () {
        let message = "";
        await RemittanceInstance.methods.pause().send({from: accounts[0]});
        try {
            await RemittanceInstance.methods.withdraw(web3.utils.utf8ToHex("*")).send({from: accounts[1]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("revert"));
    });

    it("should revert on a rogue exchange with stolen password trying to withdraw", async function () {
        let message = "";
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("Youpy74")).call();
        await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000
        });

        try {
            await RemittanceInstance.methods.withdraw(web3.utils.utf8ToHex("Youpy74")).send({from: accounts[2]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("Wrong password or not existing transaction"));
    });

    it("should revert on wrong password", async function () {
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("MyFi@tPwd")).call();
        await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000
        });

        let message = "";
        try {
            await RemittanceInstance.methods.withdraw(web3.utils.utf8ToHex("F@lsy")).send({from: accounts[1]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("Wrong password or not existing transaction"));
    });

    it("should permit to withdraw only once by the rightful people", async function () {
        const hash = await RemittanceInstance.methods.hash(accounts[1], web3.utils.utf8ToHex("MyFi@tPwd")).call();
        const gasPrice = 50;

        await RemittanceInstance.methods.initTransaction(accounts[1], hash).send({
            from: accounts[0],
            value: 10000
        });

        let theoreticalExchangeBalance = new BN(await web3.eth.getBalance(accounts[1]));
        let rcpt = await RemittanceInstance.methods.withdraw(web3.utils.utf8ToHex("MyFi@tPwd")).send({
            from: accounts[1],
            gasPrice: gasPrice
        });

        theoreticalExchangeBalance = theoreticalExchangeBalance.minus(rcpt.gasUsed * gasPrice);
        theoreticalExchangeBalance = theoreticalExchangeBalance.add(10000);
        assert.equal(await web3.eth.getBalance(accounts[1]), theoreticalExchangeBalance.toString(), "The amount of the exchange account should have been upgraded");

        assert.strictEqual(Object.keys(rcpt.events).length, 1, "1 event should be emitted");
        const event = rcpt.events.LogWithdraw;
        assert.equal(event.returnValues.initiator, accounts[1], "Initiator should be the exchange");
        assert.equal(event.returnValues.howMuch, 10000, "How much should represents the value we put in init transaction");

        let message = "";
        try {
            await RemittanceInstance.methods.withdraw(web3.utils.utf8ToHex("MyFi@tPwd")).send({from: accounts[1]});
        } catch (e) {
            message = e.message;
        }

        assert.ok(message.includes("Wrong password or not existing transaction"));
    });
});
