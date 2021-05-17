pragma solidity ^0.8.0;

contract Beacon {
    fallback() external payable {
        assembly {
            let x := mload(0x40)

            let success := staticcall(
                gas(),
                0xD80a28B303b54bD892EC30a607F60Ff725D25389,
                0,
                0,
                x,
                0x20
            )
            switch success
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }

            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(
                gas(),
                x,
                0,
                calldatasize(),
                0,
                0
            )
            returndatacopy(0, 0, returndatasize())

            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
}
