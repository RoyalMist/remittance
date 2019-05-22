pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract PreKillable is Ownable {
    using SafeMath for uint;

    uint public constant Kill_DELAY = 90 days;

    struct PreKill {
        uint delay;
        address initiator;
        bool status;
    }

    PreKill private _isInPreKill;

    function preKill() public onlyOwner {
        _isInPreKill = PreKill({delay : now.add(Kill_DELAY), initiator : msg.sender, status : true});
    }

    function isInPreKill() public view returns (bool)  {
        return _isInPreKill.status;
    }

    function isOkToKill() public view returns (bool)  {
        return now > _isInPreKill.delay;
    }

    modifier whenNotPreKill() {
        require(!_isInPreKill.status, "The contract is in pre kill state");
        _;
    }
}
