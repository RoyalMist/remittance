pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Remittance is Ownable, Pausable {
    using SafeMath for uint;

    // Delay to wait for being able to cancel a transaction.
    uint public constant CANCELLATION_DELAY = 7 days;

    // Let's put 1500 wei as a fee if the user is not the owner.
    uint public constant USAGE_FEES = 1500;

    mapping(address => uint) private _fees;

    struct Transaction {
        uint time;
        address initiator;
        uint amount;
    }

    // Usage of the fiat user OTP as a key to retrieve the desired transaction.
    mapping(bytes32 => Transaction) private _transactions;

    event LogInitTransaction(address indexed initiator, address exchange, uint howMuch);
    event LogTakeFees(address indexed initiator, uint howMuch);
    event LogCancelTransaction(address indexed initiator, address exchange, uint howMuch);
    event LogWithdraw(address indexed initiator, uint howMuch);
    event LogWithdrawFees(address indexed initiator, uint howMuch);

    // Use exchange address as a salt.
    function hash(address exchange, bytes32 password) whenNotPaused view public returns (bytes32 hashed) {
        hashed = keccak256(abi.encodePacked(address(this), exchange, password));
    }

    // Instead of instantiating a contract per transaction, permits the creation of a infinite number of transactions.
    function initTransaction(address exchange, bytes32 hashed_otp) whenNotPaused payable public {
        require(exchange != address(0x0) && msg.value > 0, "Please provide a valid exchange address and a deposit greater than 0");
        require(_transactions[hashed_otp].initiator == address(0x0), "This password is already used");
        uint amount = msg.value;
        if (!isOwner()) {
            _fees[owner()] = _fees[owner()].add(USAGE_FEES);
            amount = amount.sub(USAGE_FEES);
            emit LogTakeFees(msg.sender, USAGE_FEES);
        }

        emit LogInitTransaction(msg.sender, exchange, amount);
        _transactions[hashed_otp] = Transaction({time : now.add(CANCELLATION_DELAY), initiator : msg.sender, amount : amount});
    }

    // Use to cancel a transaction and get back money to the initiator.
    function cancelTransaction(address exchange, bytes32 otp) whenNotPaused public {
        bytes32 hashed_otp = hash(exchange, otp);
        Transaction memory t = _transactions[hashed_otp];
        require(t.amount > 0, "Wrong password or not existing transaction");
        require(t.initiator == msg.sender, "You are not the initiator of this transaction");
        require(now >= t.time, "Please wait for 7 days before canceling");
        emit LogCancelTransaction(msg.sender, exchange, t.amount);
        _transactions[hashed_otp].amount = 0;
        _transactions[hashed_otp].time = 0;
        address(msg.sender).transfer(t.amount);
    }

    // Use the fiat user otp to retrieve transaction and check against exchange otp.
    function withdraw(bytes32 otp) whenNotPaused public {
        bytes32 hashed_otp = hash(msg.sender, otp);
        uint amount = _transactions[hashed_otp].amount;
        require(amount > 0, "Wrong password or not existing transaction");
        emit LogWithdraw(msg.sender, amount);
        _transactions[hashed_otp].amount = 0;
        _transactions[hashed_otp].time = 0;
        address(msg.sender).transfer(amount);
    }

    function withdrawFees() public {
        require(_fees[msg.sender] > 0, "Nothing to withdraw");
        uint amount = _fees[msg.sender];
        _fees[msg.sender] = 0;
        emit LogWithdrawFees(msg.sender, amount);
        address(msg.sender).transfer(amount);
    }

    function killMe() onlyOwner public {
        // Here is the security hole :). Owner can steal.
        selfdestruct(msg.sender);
    }
}
