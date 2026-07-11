// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BlocksSkin — paid cosmetic-skin ownership ledger for BLOCKS.
/// Anyone can mint a skin by paying PRICE; ownership is recorded per player
/// per skin id. No transfer/burn — purely additive cosmetic permission.
/// Owner can withdraw collected ETH.
contract BlocksSkin {
    uint256 public constant PRICE = 0.0000111 ether;
    uint8 public constant SKIN_COUNT = 8;             // upper bound on valid ids

    address public owner;
    mapping(address => mapping(uint8 => bool)) private _owned;

    event SkinMinted(address indexed player, uint8 indexed skinId, uint256 paid);

    error WrongPrice();
    error InvalidSkin();
    error AlreadyOwned();
    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    function mintSkin(uint8 skinId) external payable {
        if (msg.value != PRICE) revert WrongPrice();
        if (skinId == 0 || skinId >= SKIN_COUNT) revert InvalidSkin();
        if (_owned[msg.sender][skinId]) revert AlreadyOwned();
        _owned[msg.sender][skinId] = true;
        emit SkinMinted(msg.sender, skinId, msg.value);
    }

    function isOwned(address player, uint8 skinId) external view returns (bool) {
        return _owned[player][skinId];
    }

    /// Returns a bitmask of which skinIds (1..7) the player owns.
    function ownedMask(address player) external view returns (uint256 mask) {
        unchecked {
            for (uint8 i = 1; i < SKIN_COUNT; i++) {
                if (_owned[player][i]) mask |= (uint256(1) << i);
            }
        }
    }

    function withdraw(address payable to) external {
        if (msg.sender != owner) revert NotOwner();
        to.transfer(address(this).balance);
    }

    function transferOwnership(address next) external {
        if (msg.sender != owner) revert NotOwner();
        owner = next;
    }
}
