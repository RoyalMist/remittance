pragma solidity ^0.5.2;

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
    function initTransaction(address _exchange, bytes32 _fiat_hashed_otp) onlyOwner payable public {
        require(_exchange != address(0x0) && msg.value > 0, "Please provide a valid exchange address and a deposit greater than 0");
        require(transactions[_fiat_hashed_otp].exchange == address(0x0), "This password is already used");
        emit LogInitTransaction(msg.sender, _exchange, msg.value);
        transactions[_fiat_hashed_otp] = Transaction({exchange : _exchange, amount : msg.value});
    }

    // Exchanges can change their password at anytime.
    function setExchangePassword(bytes32 _hashedExchangePassword) public {
        emit LogSetExchangePassword(msg.sender);
        exchangePasswords[msg.sender] = _hashedExchangePassword;
    }

    // Use the fiat user otp to retrieve transaction and check against exchange otp.
    function withdraw(bytes32 _exchange_otp, bytes32 _fiat_otp) public {
        require(hash(_exchange_otp) == exchangePasswords[msg.sender], "Wrong exchange password");
        bytes32 fiat_hashed_otp = hash(_fiat_otp);
        Transaction memory t = transactions[fiat_hashed_otp];
        require(t.exchange != address(0x0), "Wrong fiat user password");
        require(t.exchange == msg.sender, "You are not the exchange selected for this operation");
        emit LogWithdraw(msg.sender, t.amount);
        delete (transactions[fiat_hashed_otp]);
        address(msg.sender).transfer(t.amount);
    }

    // Use contract address as a salt. May be not sufficient to protect from rainbow tables as Slat is known :(
    function hash(bytes32 _password) view public returns (bytes32 hashed) {
        hashed = keccak256(abi.encodePacked(address(this), _password));
    }
}
