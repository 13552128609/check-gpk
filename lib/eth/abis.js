const SMG_ABI = [
  "function getThresholdByGrpId(bytes32 groupId) view returns (uint256)",
  "function getSelectedSmInfo(bytes32 groupId, uint256 index) view returns (address wkAddr, bytes PK, bytes enodeId)",
];

const GPK_ABI = [
  "function getGpkCount(bytes32 groupId) view returns (uint256)",
  "function getGpkbyIndex(bytes32 groupId, uint8 gpkIndex) view returns (bytes)",
  "function getGpkSharebyIndex(bytes32 groupId, uint16 smIndex, uint8 gpkIndex) view returns (bytes)",
  "function groupMap(bytes32 groupId) view returns (bytes32 groupId_, uint16 round, uint32 ployCommitPeriod, uint32 defaultPeriod, uint32 negotiatePeriod, uint16 smNumber)",
];

module.exports = {
  SMG_ABI,
  GPK_ABI,
};
