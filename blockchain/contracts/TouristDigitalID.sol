// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TouristDigitalID
 * @dev Smart contract for creating and managing digital IDs for tourists
 * Development-focused implementation for Ganache GUI integration
 */
contract TouristDigitalID {
    
    // Digital ID status enumeration
    enum Status {
        Active,
        Suspended,
        Expired,
        Revoked
    }

    // Structure for storing digital ID data
    struct DigitalID {
        uint256 digitalId;
        string touristUserId;
        string name;
        address authorityAddress;
        bytes32 kycDocumentHash;
        bytes32 personalDataHash;
        uint256 issueTimestamp;
        uint256 expirationTimestamp;
        Status status;
        uint8 verificationLevel; // 1-5 scale
        bool exists;
    }

    // Contract owner (admin authority)
    address public owner;
    
    // Authorized authorities mapping
    mapping(address => bool) public authorizedAuthorities;
    
    // Digital ID storage
    mapping(uint256 => DigitalID) public digitalIDs;
    mapping(string => uint256) public touristToDigitalId; // touristUserId => digitalId
    
    // Counters
    uint256 public nextDigitalId = 1;
    uint256 public totalActiveIDs = 0;
    
    // Contract pause state
    bool public paused = false;

    // Events
    event DigitalIDCreated(
        uint256 indexed digitalId,
        string indexed touristUserId,
        address indexed authority,
        uint8 verificationLevel
    );
    
    event IDStatusUpdated(
        uint256 indexed digitalId,
        Status oldStatus,
        Status newStatus,
        address updatedBy
    );
    
    event IDVerificationRequested(
        uint256 indexed digitalId,
        address indexed verifier
    );
    
    event AuthorityStatusChanged(
        address indexed authority,
        bool authorized,
        address changedBy
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedAuthorities[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier validDigitalId(uint256 _digitalId) {
        require(digitalIDs[_digitalId].exists, "Digital ID does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedAuthorities[msg.sender] = true;
    }

    /**
     * @dev Set or revoke authority status for an address
     * @param _authority Address to modify
     * @param _isAuthorized True to authorize, false to revoke
     */
    function setAuthority(address _authority, bool _isAuthorized) external onlyOwner {
        require(_authority != address(0), "Invalid authority address");
        authorizedAuthorities[_authority] = _isAuthorized;
        emit AuthorityStatusChanged(_authority, _isAuthorized, msg.sender);
    }

    /**
     * @dev Pause contract operations (emergency stop)
     */
    function pauseContract() external onlyOwner {
        paused = true;
    }

    /**
     * @dev Unpause contract operations
     */
    function unpauseContract() external onlyOwner {
        paused = false;
    }

    /**
     * @dev Create a new digital ID for a tourist
     * @param _touristUserId Unique tourist user ID from the system
     * @param _name Tourist's name
     * @param _kycHash Hash of KYC document
     * @param _personalHash Hash of personal information
     * @param _expirationTimestamp Expiration timestamp for the ID
     * @param _verificationLevel Verification level (1-5)
     * @return digitalId The created digital ID number
     */
    function createDigitalID(
        string memory _touristUserId,
        string memory _name,
        bytes32 _kycHash,
        bytes32 _personalHash,
        uint256 _expirationTimestamp,
        uint8 _verificationLevel
    ) external onlyAuthorized whenNotPaused returns (uint256) {
        require(bytes(_touristUserId).length > 0, "Tourist user ID cannot be empty");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_expirationTimestamp > block.timestamp, "Expiration must be in future");
        require(_verificationLevel >= 1 && _verificationLevel <= 5, "Verification level must be 1-5");
        require(touristToDigitalId[_touristUserId] == 0, "Digital ID already exists for this tourist");

        uint256 digitalId = nextDigitalId++;
        
        digitalIDs[digitalId] = DigitalID({
            digitalId: digitalId,
            touristUserId: _touristUserId,
            name: _name,
            authorityAddress: msg.sender,
            kycDocumentHash: _kycHash,
            personalDataHash: _personalHash,
            issueTimestamp: block.timestamp,
            expirationTimestamp: _expirationTimestamp,
            status: Status.Active,
            verificationLevel: _verificationLevel,
            exists: true
        });
        
        touristToDigitalId[_touristUserId] = digitalId;
        totalActiveIDs++;
        
        emit DigitalIDCreated(digitalId, _touristUserId, msg.sender, _verificationLevel);
        
        return digitalId;
    }

    /**
     * @dev Update the status of a digital ID
     * @param _digitalId Digital ID to update
     * @param _newStatus New status for the ID
     */
    function updateIDStatus(uint256 _digitalId, Status _newStatus) 
        external 
        onlyAuthorized 
        whenNotPaused 
        validDigitalId(_digitalId) 
    {
        Status oldStatus = digitalIDs[_digitalId].status;
        require(oldStatus != _newStatus, "Status is already set to this value");
        
        digitalIDs[_digitalId].status = _newStatus;
        
        // Update active ID counter
        if (oldStatus == Status.Active && _newStatus != Status.Active) {
            totalActiveIDs--;
        } else if (oldStatus != Status.Active && _newStatus == Status.Active) {
            totalActiveIDs++;
        }
        
        emit IDStatusUpdated(_digitalId, oldStatus, _newStatus, msg.sender);
    }

    /**
     * @dev Renew a digital ID with a new expiration date
     * @param _digitalId Digital ID to renew
     * @param _newExpiration New expiration timestamp
     */
    function renewDigitalID(uint256 _digitalId, uint256 _newExpiration) 
        external 
        onlyAuthorized 
        whenNotPaused 
        validDigitalId(_digitalId) 
    {
        require(_newExpiration > block.timestamp, "New expiration must be in future");
        require(_newExpiration > digitalIDs[_digitalId].expirationTimestamp, "New expiration must be later than current");
        
        digitalIDs[_digitalId].expirationTimestamp = _newExpiration;
        
        // If expired, reactivate
        if (digitalIDs[_digitalId].status == Status.Expired) {
            Status oldStatus = digitalIDs[_digitalId].status;
            digitalIDs[_digitalId].status = Status.Active;
            totalActiveIDs++;
            emit IDStatusUpdated(_digitalId, oldStatus, Status.Active, msg.sender);
        }
    }

    /**
     * @dev Verify if a digital ID is valid and active
     * @param _digitalId Digital ID to verify
     * @return valid True if ID is valid and active
     * @return status Current status of the ID
     */
    function verifyDigitalID(uint256 _digitalId) 
        external 
        view 
        returns (bool valid, Status status) 
    {
        if (!digitalIDs[_digitalId].exists) {
            return (false, Status.Revoked);
        }
        
        DigitalID memory digitalID = digitalIDs[_digitalId];
        
        // Check if expired
        if (block.timestamp > digitalID.expirationTimestamp) {
            return (false, Status.Expired);
        }
        
        // Return current status
        bool isValid = (digitalID.status == Status.Active);
        return (isValid, digitalID.status);
    }

    /**
     * @dev Get complete details of a digital ID
     * @param _digitalId Digital ID to query
     * @return digitalID Complete digital ID structure
     */
    function getIDDetails(uint256 _digitalId) 
        external 
        view 
        validDigitalId(_digitalId) 
        returns (DigitalID memory digitalID) 
    {
        return digitalIDs[_digitalId];
    }

    /**
     * @dev Get digital ID by tourist user ID
     * @param _touristUserId Tourist user ID to query
     * @return digitalId The digital ID number (0 if not found)
     */
    function getIDByTouristId(string memory _touristUserId) 
        external 
        view 
        returns (uint256 digitalId) 
    {
        return touristToDigitalId[_touristUserId];
    }

    /**
     * @dev Get contract statistics
     * @return totalIDs Total number of IDs created
     * @return activeIDs Number of active IDs
     * @return totalAuthorities Number of authorized authorities
     */
    function getContractStats() 
        external 
        view 
        returns (uint256 totalIDs, uint256 activeIDs, uint256 totalAuthorities) 
    {
        // Count authorities (simple implementation for development)
        uint256 authCount = 0;
        // Note: In production, you'd maintain a list of authorities for counting
        
        return (nextDigitalId - 1, totalActiveIDs, authCount);
    }

    /**
     * @dev Development helper: Reset contract state (owner only, development use)
     */
    function resetContract() external onlyOwner {
        // Reset counters
        nextDigitalId = 1;
        totalActiveIDs = 0;
        
        // Note: For full reset, would need to track and clear all mappings
        // This is a simplified version for development
    }

    /**
     * @dev Development helper: Batch create multiple digital IDs
     * @param _touristUserIds Array of tourist user IDs
     * @param _names Array of names
     * @param _kycHashes Array of KYC hashes
     * @param _personalHashes Array of personal data hashes
     * @param _verificationLevels Array of verification levels
     */
    function batchCreateIDs(
        string[] memory _touristUserIds,
        string[] memory _names,
        bytes32[] memory _kycHashes,
        bytes32[] memory _personalHashes,
        uint8[] memory _verificationLevels
    ) external onlyOwner whenNotPaused {
        require(_touristUserIds.length == _names.length, "Array length mismatch");
        require(_touristUserIds.length == _kycHashes.length, "Array length mismatch");
        require(_touristUserIds.length == _personalHashes.length, "Array length mismatch");
        require(_touristUserIds.length == _verificationLevels.length, "Array length mismatch");
        
        uint256 expirationTimestamp = block.timestamp + 365 days; // 1 year validity
        
        for (uint256 i = 0; i < _touristUserIds.length; i++) {
            if (touristToDigitalId[_touristUserIds[i]] == 0) { // Only if not exists
                uint256 digitalId = nextDigitalId++;
                
                digitalIDs[digitalId] = DigitalID({
                    digitalId: digitalId,
                    touristUserId: _touristUserIds[i],
                    name: _names[i],
                    authorityAddress: msg.sender,
                    kycDocumentHash: _kycHashes[i],
                    personalDataHash: _personalHashes[i],
                    issueTimestamp: block.timestamp,
                    expirationTimestamp: expirationTimestamp,
                    status: Status.Active,
                    verificationLevel: _verificationLevels[i],
                    exists: true
                });
                
                touristToDigitalId[_touristUserIds[i]] = digitalId;
                totalActiveIDs++;
                
                emit DigitalIDCreated(digitalId, _touristUserIds[i], msg.sender, _verificationLevels[i]);
            }
        }
    }
}