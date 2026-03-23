# Neon Territory Multiplayer Plan v1

## Goal
Build a real-time multiplayer mode where multiple players share the same map, see each other live, and can cut each other's trails.

## Why the current version is not multiplayer yet
The current game is fully client-side. Each browser simulates its own world, so players cannot share one authoritative map.

## Target architecture
- Frontend: HTML5 Canvas client
- Realtime transport: WebSocket / Socket.IO
- Server: Node.js authoritative game server
- Persistence: Supabase for leaderboard, sessions, optional room metadata

## Core rule
The server owns the truth.
Clients only send inputs like:
- up
n- down
- left
- right

The server computes:
- movement
- collisions
- trail state
- territory capture
- kills
- score

Then the server broadcasts the current world state to all connected players.

## Phase roadmap
### Phase M1
- Persist player name locally
- Add visible Top 10 leaderboard
- Add session restore after reload

### Phase M2
- Introduce backend folder
- Create Node.js server with Socket.IO
- Add health endpoint and room creation
- Allow one shared room with multiple users

### Phase M3
- Move movement and collision logic to the server
- Clients become render + input only
- Broadcast player positions and trails 10 to 20 times per second

### Phase M4
- Shared map state
- Territory claiming on the server
- Bot support on the server
- Trail cutting and deaths synchronized for all players

### Phase M5
- Room browser
- Private rooms / public rooms
- Spectator mode
- Reconnect handling

## Networking model
Client sends:
- join_room
- input_direction
- ping

Server sends:
- world_snapshot
- player_joined
- player_left
- player_died
- leaderboard_update
- round_state

## Data model
### Player
- id
- name
- color
- x
- y
- direction
- alive
- score
- territoryPercent
- trail[]

### Room
- id
- mapWidth
- mapHeight
- players[]
- bots[]
- blocks[]
- apples[]
- status

## First implementation recommendation
Do not start with global open matchmaking.
Start with:
- one room
- max 4 human players
- optional bots
- one shared map

This is the fastest path to a real multiplayer prototype.

## Immediate next coding target
Create:
- /server/package.json
- /server/index.js
- /server/gameRoom.js
- /server/gameState.js
- /server/README.md

And connect the current frontend to the server through Socket.IO.
