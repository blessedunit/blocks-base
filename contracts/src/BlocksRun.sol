// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BlocksRun — onchain leaderboard for the BLOCKS platformer.
/// Records each run's score, time, and how many of the 16 levels were cleared.
/// Best score is per-player across any run; best time only counts FULL clears
/// (levelsCleared == 16) so speedrun ranking is for actual finishers only.
contract BlocksRun {
    mapping(address => uint256) private _bestScore;
    mapping(address => uint256) private _bestTime;   // 0 if player never full-cleared

    event RunRecorded(
        address indexed player,
        uint256 score,
        uint256 timeMs,
        uint8 levelsCleared
    );

    function recordRun(uint256 score, uint256 timeMs, uint8 levelsCleared) external {
        if (score > _bestScore[msg.sender]) {
            _bestScore[msg.sender] = score;
        }
        if (levelsCleared >= 16) {
            uint256 prev = _bestTime[msg.sender];
            if (prev == 0 || timeMs < prev) {
                _bestTime[msg.sender] = timeMs;
            }
        }
        emit RunRecorded(msg.sender, score, timeMs, levelsCleared);
    }

    function bestScore(address player) external view returns (uint256) {
        return _bestScore[player];
    }

    function bestTime(address player) external view returns (uint256) {
        return _bestTime[player];
    }
}
