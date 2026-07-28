// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IMagma {
    /// @notice Struct to track pending redeem requests
    /// @dev Claimable state may transition automatically after a timestamp has passed.
    /// @dev https://eips.ethereum.org/EIPS/eip-7540#no-event-for-claimable-state
    /// @dev https://eips.ethereum.org/EIPS/eip-7540#request-lifecycle
    struct RedeemRequests {
        address owner; // Owner of the shares
        bool isGVault; // If redeemRequest is for gVault or not
        uint256 shares; // Amount of shares to redeem
        uint256 assets; // Amount of assets to withdraw
        uint256 claimableTime; // When assets become claimable
    }

    // View functions
    function claimableRedeemRequest(uint256 requestId, address controller) external view returns (uint256 shares);
    function coreVault() external view returns (address);
    function feeReceiver() external view returns (address);
    function gVault() external view returns (address);
    function isOperator(address controller, address operator) external view returns (bool);
    function mevRewardsInjector() external view returns (address);
    function owner() external view returns (address);
    function pendingRedeemRequest(uint256 requestId, address controller) external view returns (uint256 shares);
    function pendingRedeemRequestData(uint256 requestId, address controller)
        external
        view
        returns (RedeemRequests memory data);
    function ownerRequestId(address _owner) external view returns (uint256);
    function rewardsFee() external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function withdrawalFee() external view returns (uint256);

    // Write functions
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function depositWMON(uint256 assets, address receiver, uint256 referralId) external returns (uint256);
    function depositWMONGVault(uint256 assets, address receiver, uint64 valId, uint256 referralId)
        external
        returns (uint256);
    function mint(uint256 shares, address receiver) external returns (uint256);
    function redeem(uint256 requestId, address controller, address receiver) external returns (uint256 assets);
    function redeemMON(uint256 requestId, address controller, address receiver) external returns (uint256 assets);
    function refreshCache() external;
    function requestRedeem(uint256 shares, address controller, address owner) external returns (uint256 requestId);
    function requestRedeemGVault(uint256 shares, address controller, address owner, uint64 valId)
        external
        returns (uint256 requestId);
    function setOperator(address operator, bool approved) external returns (bool);

    // Payable functions
    function depositMON(address receiver, uint256 referralId) external payable returns (uint256 shares);
    function depositMONGVault(address receiver, uint64 valId, uint256 referralId)
        external
        payable
        returns (uint256 shares);

    // Events
    /// @dev Emitted upon a successful deposit, will be sent on every deposit to facilitate on the indexer side
    event DepositWithReferral(
        address indexed sender, address indexed owner, uint256 assets, uint256 shares, uint256 indexed referralId
    );
    event FeeReceiverUpdated(address indexed newFeeReceiver);
    event OperatorSet(address indexed controller, address indexed operator, bool indexed approved);
    event RedeemDelayUpdated(uint256 indexed newRedeemDelay);
    // Events for ERC-7540 compatibility and admin
    event RedeemRequest(
        address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 shares
    );
    event RewardsFeeUpdated(uint256 indexed newRewardsFee);
    event VaultsSet(address indexed newCoreVault, address indexed newGVault);
    event WithdrawalFeeUpdated(uint256 indexed newWithdrawalFee);
    event MevRewardsInjectorUpdated(address indexed oldInjector, address indexed newInjector);
}
