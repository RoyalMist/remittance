pragma solidity 0.5.8;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Remittance is Ownable {
    using SafeMath for uint;

    address public exchange;
    string private exchange_otp;
    string private debtor_otp;

    constructor(address _exchange, uint _exchange_otp, uint _debtor_otp) public {
        exchange = _exchange;
        exchange_otp = "Hash"; //_exchange_otp;
        debtor_otp = "Hash"; //_debtor_otp;
    }
}
