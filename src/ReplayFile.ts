namespace Gokz {
    export enum GlobalMode {
        Surf = 0,
        Bhop = 1,
        RJ = 2,
        SJ = 2,
    }

    export enum GlobalStyle {
        Normal = 0
    }

    export enum Button {
        Attack = 1 << 0,
        Jump = 1 << 1,
        Duck = 1 << 2,
        Forward = 1 << 3,
        Back = 1 << 4,
        Use = 1 << 5,
        Cancel = 1 << 6,
        Left = 1 << 7,
        Right = 1 << 8,
        MoveLeft = 1 << 9,
        MoveRight = 1 << 10,
        Attack2 = 1 << 11,
        Run = 1 << 12,
        Reload = 1 << 13,
        Alt1 = 1 << 14,
        Alt2 = 1 << 15,
        Score = 1 << 16,
        Speed = 1 << 17,
        Walk = 1 << 18,
        Zoom = 1 << 19,
        Weapon1 = 1 << 20,
        Weapon2 = 1 << 21,
        BullRush = 1 << 22, // ...what?
        Grenade1 = 1 << 23,
        Grenade2 = 1 << 24,
        IN_REPLAY_TELEPORTED = 1 << 27
    }

    export class TickData {
        readonly angles = new Facepunch.Vector3();
        readonly position = new Facepunch.Vector3();
        readonly viewOffset: number;
        readonly buttons: Button;

        tick = -1;

        constructor(reader: BinaryReader) {
            this.angles = reader.readVector3();
            this.position = reader.readVector3();
            this.viewOffset = reader.readFloat32();
            this.buttons = reader.readInt32();
        }

        Teleported(): boolean {
            return (this.buttons & Button.IN_REPLAY_TELEPORTED) ? true : false;
        }
    }

    export class ZoneStats {
        readonly jumps: number;
        readonly strafes: number;
        readonly syncAvg: number;
        readonly sync2Avg: number;
        readonly enterTick: number;
        readonly zoneTicks: number;
        readonly velocityMax3D: number;
        readonly velocityMax2D: number;
        readonly velocityAvg3D: number;
        readonly velocityAvg2D: number;
        readonly velocityEnterSpeed3D: number;
        readonly velocityEnterSpeed2D: number;
        readonly velocityExitSpeed3D: number;
        readonly velocityExitSpeed2D: number;

        constructor(reader: BinaryReader) {
            this.jumps = reader.readUint32();
            this.strafes = reader.readUint32();
            this.syncAvg = reader.readFloat32();
            this.sync2Avg = reader.readFloat32();
            this.enterTick = reader.readUint32();
            this.zoneTicks = reader.readUint32();
            this.velocityMax3D = reader.readFloat32();
            this.velocityMax2D = reader.readFloat32();
            this.velocityAvg3D = reader.readFloat32();
            this.velocityAvg2D = reader.readFloat32();
            this.velocityEnterSpeed3D = reader.readFloat32();
            this.velocityEnterSpeed2D = reader.readFloat32();
            this.velocityExitSpeed3D = reader.readFloat32();
            this.velocityExitSpeed2D = reader.readFloat32();
        }
    }

    export class RunStats {
        readonly totalZones: number;
        readonly zoneStats: Array<ZoneStats>;

        constructor(reader: BinaryReader) {
            this.totalZones = reader.readUint32();
            for (let i = 0; i < this.totalZones + 1; i++) {
                this.zoneStats.push(new ZoneStats(reader));
            }
        }
    }

    export class ReplayHeader {
        readonly mapName: string;          // The map the run was done in.
        readonly mapHash: string;          // The SHA1 of the map the run was done in.
        readonly playerName: string;       // The name of the player that did this run.
        readonly steamId: string;          // The steamID of the player that did this run.
        readonly tickInterval: number;     // The tickrate of the run.
        readonly runFlags: number;         // The flags the player ran with.
        readonly date: string;             // The date this run was achieved.
        readonly startTick: number;        // The tick where the timer was started (difference from record start -> timer start)
        readonly stopTick: number;         // The tick where the timer was stopped
        readonly trackNumber: number;      // The track number (0 = main map, 1+ = bonus)
        readonly zoneNumber: number;       // The zone number (0 = entire track, 1+ = specific zone)

        constructor(reader: BinaryReader) {
            this.mapName = reader.readNTString();
            this.mapHash = reader.readNTString();
            this.playerName = reader.readNTString();
            this.steamId = reader.readNTString();
            this.tickInterval = reader.readFloat32();
            this.runFlags = reader.readUint32();
            this.date = reader.readNTString();
            this.startTick = reader.readUint32();
            this.stopTick = reader.readUint32();
            this.trackNumber = reader.readUint32();
            this.zoneNumber = reader.readUint32();
        }
    }

    export class ReplayFile {
        readonly header: ReplayHeader;
        readonly hasRunStats: boolean;
        readonly runStats: RunStats;
        readonly frames: number;
        readonly data: Array<TickData>;

        mode = GlobalMode.Surf;
        style = GlobalStyle.Normal;

        constructor(data: ArrayBuffer) {
            const reader = new BinaryReader(data);

            this.header = new ReplayHeader(reader);

            this.hasRunStats = reader.readBoolean();
            if (this.hasRunStats) {
                this.runStats = new RunStats(reader);
            }

            this.frames = reader.readUint32();

            this.data = new Array<TickData>(this.frames);
            for (let i = 0; i < this.frames; i++) {
                var td = new TickData(reader);
                td.tick = i;
                this.data.push(td);
            }
        }

        getTickData(tick: number): TickData {
            if (tick > this.frames - 1) return null;
            return this.data[tick];
        }

        clampTick(tick: number): number {
            return tick < 0 ? 0 : tick >= this.frames ? this.frames - 1 : tick;
        }

        getDuration(): number {
            return (this.header.stopTick - this.header.startTick) * this.header.tickInterval;
        }
    }
}