pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Remittance is Ownable {
    struct Transaction {
        address exchange;
        uint amount;
    }

    // Permits any exchange to store their password.
    mapping(address => bytes32) private exchangePasswords;

    // Usage of the fiat user OTP as a key to retrieve the desired transaction.
    mapping(bytes32 => Transaction) private transactions;

    event LogInitTransaction(address indexed initiator, address exchange, uint howMuch);
    event LogSetExchangePassword(address indexed initiator);
    event LogWithdraw(address indexed initiator, uint howMuch);

    // Instead of instantiating a contract per transaction, permits the creation of a infinite number of transactions.
    function initTransaction(address _exchange, bytes32 _fiatOTP) onlyOwner payable public {
        require(_exchange != address(0x0) && msg.value > 0, "Please provide a valid exchange address and a deposit greater than 0");
        require(transactions[_fiatOTP].exchange != address(0x0), "This password is already used");
        emit LogInitTransaction(msg.sender, _exchange, msg.value);
        transactions[_fiatOTP] = Transaction({exchange : _exchange, amount : msg.value});
    }

    // Exchanges can change their password at anytime.
    function setExchangePassword(bytes32 _exchangePassword) public {
        emit LogSetExchangePassword(msg.sender);
        exchangePasswords[msg.sender] = _exchangePassword;
    }

    // Use the fiat user otp to retriev transaction and check against exchange otp.
    function withdraw(bytes32 _exchange_otp, bytes32 _debtor_otp) public {
        require(hash(_debtor_otp) == exchangePasswords[msg.sender], "Wrong exchange password");
        bytes32 hashed = hash(_exchange_otp);
        Transaction memory t = transactions[hashed];
        require(t.exchange != address(0x0), "Wrong fiat user password");
        require(t.exchange == msg.sender, "You are not the exchange selected for this operation.");
        emit LogWithdraw(msg.sender, t.amount);
        delete (transactions[hashed]);
        address(msg.sender).transfer(t.amount);
    }

    // Use contract address as a salt. May be not sufficient to protect from rainbow tables as Slat is known :(
    function hash(bytes32 _password) view private returns (bytes32 hashed) {
        hashed = keccak256(abi.encodePacked(address(this), _password));
    }
}
