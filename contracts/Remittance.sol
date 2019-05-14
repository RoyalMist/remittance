pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract Remittance is Ownable, Pausable {
    struct Transaction {
        address initiator;
        uint amount;
    }

    // Usage of the fiat user OTP as a key to retrieve the desired transaction.
    mapping(bytes32 => Transaction) private _transactions;

    event LogInitTransaction(address indexed initiator, address exchange, uint howMuch);
    event LogCancelTransaction(address indexed initiator, address exchange, uint howMuch);
    event LogWithdraw(address indexed initiator, uint howMuch);

    // Use exchange address as a salt.
    function hash(address exchange, bytes32 password) whenNotPaused view public returns (bytes32 hashed) {
        hashed = keccak256(abi.encodePacked(exchange, password));
    }

    // Instead of instantiating a contract per transaction, permits the creation of a infinite number of transactions.
    function initTransaction(address exchange, bytes32 hashed_otp) onlyOwner whenNotPaused payable public {
        require(exchange != address(0x0) && msg.value > 0, "Please provide a valid exchange address and a deposit greater than 0");
        require(_transactions[hashed_otp].initiator == address(0x0), "This password is already used");
        emit LogInitTransaction(msg.sender, exchange, msg.value);
        _transactions[hashed_otp] = Transaction({initiator : msg.sender, amount : msg.value});
    }

    // Use to cancel a transaction and get back money to the initiator.
    function cancelTransaction(address exchange, bytes32 otp) whenNotPaused public {
        bytes32 hashed_otp = hash(exchange, otp);
        Transaction memory t = _transactions[hashed_otp];
        require(t.initiator == msg.sender, "You are not the initiator of this transaction");
        require(t.amount > 0, "Wrong password");
        emit LogCancelTransaction(msg.sender, exchange, t.amount);
        delete _transactions[hashed_otp];
        address(msg.sender).transfer(t.amount);
    }

    // Use the fiat user otp to retrieve transaction and check against exchange otp.
    function withdraw(bytes32 otp) whenNotPaused public {
        bytes32 hashed_otp = hash(msg.sender, otp);
        uint amount = _transactions[hashed_otp].amount;
        require(amount > 0, "Wrong password");
        emit LogWithdraw(msg.sender, amount);
        delete _transactions[hashed_otp];
        address(msg.sender).transfer(amount);
    }
}
