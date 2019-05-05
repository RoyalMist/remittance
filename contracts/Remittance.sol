pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Remittance is Ownable {
    address public exchange;
    bytes32 public exchange_otp;
    bytes32 public debtor_otp;

    event LogDeposit(address indexed initiator, uint howMuch);
    event LogSetOTPs(address indexed initiator);
    event LogWithdraw(address indexed initiator, uint howMuch);

    constructor(address _exchange) public {
        require(_exchange != address(0x0), "Please provide a valid address");
        exchange = _exchange;
    }

    function setOTPs(string memory _exchange_otp, string memory _debtor_otp) onlyOwner public {
        //TODO String inequality.
        //require(_exchange_otp != "" && _debtor_otp != "", "Please provide non empty passwords");
        exchange_otp = hash(_exchange_otp);
        debtor_otp = hash(_debtor_otp);
        emit LogSetOTPs(msg.sender);
    }

    function deposit() onlyOwner payable public {
        emit LogDeposit(msg.sender, msg.value);
    }

    function withdraw(string memory _exchange_otp, string memory _debtor_otp) public {
        require(msg.sender == exchange && address(this).balance > 0);
        require(hash(_exchange_otp) == exchange_otp && hash(_debtor_otp) == debtor_otp, "One or more password is wrong");
        emit LogWithdraw(msg.sender, address(this).balance);
        address(msg.sender).transfer(address(this).balance);
    }

    function hash(string memory _password) view private returns (bytes32 hash) {
        hash = keccak256(abi.encodePacked(address(this), exchange, _password));
    }
}
