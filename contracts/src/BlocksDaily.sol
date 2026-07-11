// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BlocksDaily — daily-challenge onchain ranking for BLOCKS.
/// Each player's best score + best time per day key (e.g., 20260522 = 2026-05-22).
/// Client computes `dayKey = year * 10000 + month * 100 + day` and submits it.
/// Anyone can read leaderboards by replaying DailyRunRecorded events for a day.
contract BlocksDaily {
    // dayKey => player => bestScore
    mapping(uint32 => mapping(address => uint256)) private _bestScore;
    // dayKey => player => bestTime
    mapping(uint32 => mapping(address => uint256)) private _bestTime;

    event DailyRunRecorded(
        uint32 indexed dayKey,
        address indexed player,
        uint256 score,
        uint256 timeMs,
        bool cleared
    );

    function recordDailyRun(uint32 dayKey, uint256 score, uint256 timeMs, bool cleared) external {
        if (score > _bestScore[dayKey][msg.sender]) {
            _bestScore[dayKey][msg.sender] = score;
        }
        if (cleared) {
            uint256 prev = _bestTime[dayKey][msg.sender];
            if (prev == 0 || timeMs < prev) {
                _bestTime[dayKey][msg.sender] = timeMs;
            }
        }
        emit DailyRunRecorded(dayKey, msg.sender, score, timeMs, cleared);
    }

    function bestScore(uint32 dayKey, address player) external view returns (uint256) {
        return _bestScore[dayKey][player];
    }

    function bestTime(uint32 dayKey, address player) external view returns (uint256) {
        return _bestTime[dayKey][player];
    }
}
