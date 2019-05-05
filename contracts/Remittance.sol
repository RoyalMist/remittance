pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Remittance is Ownable {
    using SafeMath for uint;

    address public exchange;
    bytes32 public exchange_otp;
    bytes32 public debtor_otp;

    constructor(address _exchange, string memory _exchange_otp, string memory _debtor_otp) public {
        exchange = _exchange;
        exchange_otp = keccak256(abi.encodePacked(address(this), exchange, _exchange_otp));
        debtor_otp = keccak256(abi.encodePacked(address(this), exchange, _debtor_otp));
    }
}
