// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title IERC5192 Minimal Soulbound Token Interface
interface IERC5192 {
    /// @dev Emitted when the token becomes locked (soulbound).
    event Locked(uint256 tokenId);
    /// @dev Emitted when the token becomes unlocked.
    event Unlocked(uint256 tokenId);

    /// @notice Returns true if the token is locked to the owner's account.
    function locked(uint256 tokenId) external view returns (bool);
}

/// @title ReputationSBT
/// @notice Non-transferable ERC-721 Soulbound Token minted as on-chain reputation for completed gigs.
contract ReputationSBT is ERC721, Ownable, IERC5192 {
    error TransfersDisabled();
    error OnlyEscrowAllowed();
    error ZeroAddress();

    struct JobRecord {
        uint256 dealId;
        string jobTitle;
        uint256 timestamp;
        address seller;
    }

    uint256 private _nextTokenId;
    address public escrowContract;

    // tokenId => JobRecord
    mapping(uint256 => JobRecord) public jobRecords;

    // Interface ID for ERC-5192
    bytes4 private constant _INTERFACE_ID_ERC5192 = 0xb45a3c0e;

    event EscrowContractUpdated(address indexed previousEscrow, address indexed newEscrow);
    event ReputationMinted(address indexed seller, uint256 indexed tokenId, uint256 indexed dealId, string jobTitle);

    modifier onlyEscrow() {
        if (msg.sender != escrowContract) revert OnlyEscrowAllowed();
        _;
    }

    constructor(address initialOwner) ERC721("SwipeGig Reputation SBT", "SG-SBT") Ownable(initialOwner) {}

    /// @notice Set the authorized GigEscrow contract allowed to mint reputation SBTs.
    function setEscrowContract(address _escrow) external onlyOwner {
        if (_escrow == address(0)) revert ZeroAddress();
        address old = escrowContract;
        escrowContract = _escrow;
        emit EscrowContractUpdated(old, _escrow);
    }

    /// @notice Mint a new Reputation SBT upon successful job completion and escrow release.
    function mint(
        address to,
        uint256 dealId,
        string calldata jobTitle
    ) external onlyEscrow returns (uint256) {
        if (to == address(0)) revert ZeroAddress();

        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);

        jobRecords[tokenId] = JobRecord({
            dealId: dealId,
            jobTitle: jobTitle,
            timestamp: block.timestamp,
            seller: to
        });

        emit Locked(tokenId);
        emit ReputationMinted(to, tokenId, dealId, jobTitle);

        return tokenId;
    }

    /// @notice ERC-5192: All minted reputation tokens are permanently soulbound.
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// @dev Blocks transfers except during initial minting (from address(0)).
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        // Minting from address(0) is permitted; transfers between accounts are blocked
        if (from != address(0) && to != address(0)) {
            revert TransfersDisabled();
        }
        return super._update(to, tokenId, auth);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == _INTERFACE_ID_ERC5192 || super.supportsInterface(interfaceId);
    }
}
