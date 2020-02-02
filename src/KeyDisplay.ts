namespace Gokz {
    export class KeyDisplay {
        private readonly viewer: ReplayViewer;

        private readonly element: HTMLElement;
        private readonly buttonMap: { [button: number]: HTMLElement } = {};

        private readonly syncValueElem: HTMLElement;
        private readonly speedValueElem: HTMLElement;

        syncSampleRange = 4;
        speedSampleRange = 1 / 8;

        constructor(viewer: ReplayViewer, container?: HTMLElement) {
            this.viewer = viewer;

            if (container === undefined) container = viewer.container;

            const element = this.element = document.createElement("div");
            element.classList.add("key-display");
            element.innerHTML = `
                <div class="stat sync-outer">SyncAvg: <span class="value sync-value">0.0</span> %</div>
                <div class="stat speed-outer">Speed: <span class="value speed-value">000</span> u/s</div>
                <div class="key key-w">W</div>
                <div class="key key-a">A</div>
                <div class="key key-s">S</div>
                <div class="key key-d">D</div>
                <div class="key key-m1">M1</div>
                <div class="key key-m2">M2</div>
                <div class="key key-walk">Walk</div>
                <div class="key key-duck">Duck</div>
                <div class="key key-jump">Jump</div>`;

            container.appendChild(element);

            this.buttonMap[Button.Forward] = element.getElementsByClassName("key-w")[0] as HTMLElement;
            this.buttonMap[Button.MoveLeft] = element.getElementsByClassName("key-a")[0] as HTMLElement;
            this.buttonMap[Button.Back] = element.getElementsByClassName("key-s")[0] as HTMLElement;
            this.buttonMap[Button.MoveRight] = element.getElementsByClassName("key-d")[0] as HTMLElement;
            this.buttonMap[Button.Attack] = element.getElementsByClassName("key-m1")[0] as HTMLElement;
            this.buttonMap[Button.Attack2] = element.getElementsByClassName("key-m2")[0] as HTMLElement;
            this.buttonMap[Button.Walk] = element.getElementsByClassName("key-walk")[0] as HTMLElement;
            this.buttonMap[Button.Duck] = element.getElementsByClassName("key-duck")[0] as HTMLElement;
            this.buttonMap[Button.Jump] = element.getElementsByClassName("key-jump")[0] as HTMLElement;

            this.syncValueElem = element.getElementsByClassName("sync-value")[0] as HTMLElement;
            this.speedValueElem = element.getElementsByClassName("speed-value")[0] as HTMLElement;

            viewer.showKeyDisplayChanged.addListener(showKeyDisplay => {
                if (showKeyDisplay && viewer.cameraMode === SourceUtils.CameraMode.Fixed) this.show();
                else this.hide();
            });

            viewer.cameraModeChanged.addListener(cameraMode => {
                if (viewer.showKeyDisplay && cameraMode === SourceUtils.CameraMode.Fixed) this.show();
                else this.hide();
            });

            viewer.playbackSkipped.addListener(oldTick => {
                this.lastTick = viewer.replay.clampTick(viewer.playbackRate > 0
                    ? viewer.tick - 32
                    : viewer.tick + 32);
            });

            viewer.tickChanged.addListener(tickData => {
                this.updateButtons(tickData);
                this.updateSpeed();
                this.updateSync();
            });
        }

        private updateButtons(tickData: TickData): void {
            for (let key in this.buttonMap) {
                const pressed = (tickData.buttons & (parseInt(key) as Button)) !== 0;

                if (pressed) {
                    this.buttonMap[key].classList.add("pressed");
                } else {
                    this.buttonMap[key].classList.remove("pressed");
                }
            }
        }

        private readonly tempPosition = new Facepunch.Vector3();

        private lastTick = 0;

        private updateSync(): void {
            if (this.lastTick === this.viewer.tick) return;

            const replay = this.viewer.replay;
            const zoneStats = replay.getZoneStats(this.viewer.tick);
            this.lastTick = this.viewer.tick;

            if (zoneStats != null) {
                this.syncValueElem.innerText = zoneStats.syncAvg.toFixed(1);
            } else {
                this.syncValueElem.innerText = "-1";
            }
        }

        private getSpeedAtTick(tick: number, tickRange: number): number {
            const replay = this.viewer.replay;
            const firstTick = replay.clampTick(tick - Math.ceil(tickRange / 2));
            const lastTick = replay.clampTick(firstTick + tickRange);
            tickRange = lastTick - firstTick;

            const position = this.tempPosition;

            var tickData = replay.getTickData(lastTick);
            position.copy(tickData.position);

            tickData = replay.getTickData(firstTick);
            position.sub(tickData.position);

            // Ignore vertical speed
            position.z = 0;

            return position.length() / replay.header.tickInterval / Math.max(1, lastTick - firstTick);
        }

        private getVelocityAtTick(tick: number, tickRange: number): Facepunch.Vector3 {
            const replay = this.viewer.replay;
            const firstTick = replay.clampTick(tick - Math.ceil(tickRange / 2));
            const lastTick = replay.clampTick(firstTick + tickRange);
            tickRange = lastTick - firstTick;

            const position = this.tempPosition;

            var tickData = replay.getTickData(lastTick);
            position.copy(tickData.position);

            tickData = replay.getTickData(firstTick);
            position.sub(tickData.position);

            return position.multiplyScalar(1 / replay.header.tickInterval / Math.max(1, lastTick - firstTick));
        }

        private updateSpeed(): void {
            // TODO: cache

            const replay = this.viewer.replay;
            const maxTickRange = Math.ceil(this.speedSampleRange / replay.header.tickInterval);

            let speedString = Math.round(this.getSpeedAtTick(this.viewer.tick, maxTickRange)).toString();

            for (; speedString.length < 3; speedString = "0" + speedString);

            this.speedValueElem.innerText = speedString;
        }

        show(): void {
            this.element.style.display = "block";
        }

        hide(): void {
            this.element.style.display = "none";
        }
    }
}