export default class Timing {
    private Drivers: any[] = [];
    private Sectors: any[] = [];
    private CurrentSessionNum = 0;

    // Lap Times Def
    private carIdxCurrentLap: number[] = [];
    private carIdxCurrentLapStartTime: number[] = [];
    private carIdxLapTimes: string[][] = [];
    private carIdxGapInFront: string[] = [];

    private carIdxPittedLap: number[] = [];
    private carIdxPittedStart: number[] = [];
    private carIdxPitTime: number[] = [];
    private carIdxPitLapRecord: number[][] = [];
    private carIdxPitLastStopTime: number[] = [];

    private carIdxStintRecord: number[][] = [];

    private lapTimeToString(minutes: number, seconds: number) {
        return `${Math.floor(minutes).toFixed(0)}:${Math.floor(seconds) >= 10 ? seconds.toFixed(2) : "0" + seconds.toFixed(2)}}`
    }

    public OnNewLap(data: any, carIdx: number) {
        if(!this.carIdxLapTimes[carIdx]) {
            this.carIdxLapTimes[carIdx] = [];
        }

        if (data.values.CarIdxLap[carIdx] === -1) {
            return;
        }

        if (this.carIdxCurrentLap[carIdx] !== data.values.CarIdxLap[carIdx]) {
            //calc lap time
            const sessionTime = data.values.SessionTime;
            const startTime = this.carIdxCurrentLapStartTime[carIdx];
            if (!startTime) {
                this.carIdxCurrentLapStartTime[carIdx] = sessionTime;
                this.carIdxCurrentLap[carIdx] = data.values.CarIdxLap;
                return;
            }
            if (!this.carIdxLapTimes[carIdx]) {
                this.carIdxLapTimes[carIdx] = []
            }

            const lapTimeSec = (sessionTime - startTime);
            const mins = lapTimeSec / 60;
            const seconds = lapTimeSec - (60 * Math.floor(mins));
            this.carIdxLapTimes[carIdx].push(this.lapTimeToString(mins, seconds));
            this.carIdxCurrentLapStartTime[carIdx] = sessionTime;
            this.carIdxCurrentLap = data.values.CarIdxLap[carIdx];

            // process gap on lap change
            const carIdxPosition = data.values.CarIdxPosition[carIdx]
            if(carIdxPosition === 1) {
                this.carIdxGapInFront[carIdx] = "---";
                return;
            }

            for (let p = 0; p < data.values.CarIdxPosition.length; p++) {
                if (data.values.CarIdxPosition[p] === (carIdxPosition - 1)) {
                    // Test if cars are in the same lap
                    if (data.values.CarIdxLap[carIdx] === data.values.CarIdxLap[p]) {
                        this.carIdxGapInFront[carIdx] = (this.carIdxCurrentLapStartTime[carIdx] - this.carIdxCurrentLapStartTime[p]).toFixed(2);
                    }
                    else {
                        this.carIdxGapInFront[carIdx] = `${data.values.CarIdxLap[p] - data.values.CarIdxLap[carIdx]} L`;
                    }
                    break;
                }
            }
        }
    }

    public OnPitLane(data: any, i: number) {
        if (!this.carIdxPitLapRecord[i]) {
            this.carIdxPitLapRecord[i] = [];
        }
        if (!this.carIdxStintRecord[i]) {
            this.carIdxStintRecord[i] = [];
        }
        if (!this.carIdxPitTime[i]) {
            this.carIdxPitTime[i] = 0;
        }
        if (data.values.CarIdxLap[i] === -1) {
            return;
        }
        // if car is on pit road and counter is 0
        // car has just entered the pits
        if (data.values.CarIdxOnPitRoad[i] && this.carIdxPitTime[i] === 0 && data.values.CarIdxTrackSurface[i] === "InPitStall") {
            if (this.carIdxPitLapRecord[i].length === 0) {
                this.carIdxStintRecord[i].push(data.values.CarIdxLap[i]);
            } else {
                this.carIdxStintRecord[i].push(data.values.CarIdxLap[i] -
                    this.carIdxPitLapRecord[i][this.carIdxPitLapRecord[i].length - 1]);
            }
            this.carIdxPittedStart[i] = data.values.SessionTime;
            this.carIdxPittedLap[i] = data.values.CarIdxLap[i];
            this.carIdxPitLapRecord[i].push(data.values.CarIdxLap[i]);
            // set time in pits to non 0 value
            this.carIdxPitTime[i] = 0.1;
        }
            // if car is on pit road and counter is > 0
        // car is currently in the pits
        else if (data.values.CarIdxOnPitRoad[i] && this.carIdxPitTime[i] > 0 && data.values.CarIdxTrackSurface[i] === "InPitStall") {
            const intermediate = (data.values.SessionTime) - (this.carIdxPittedStart[i]);
            this.carIdxPitTime[i] =
                intermediate > 0.1 ? intermediate : 0.1;
        }
            // if car is not on pit road
            // set pit time to 0
        // check for different lap to try and counteract telemetry gaps
        else if (!data.values.CarIdxOnPitRoad[i] && data.values.CarIdxLap[i] !== this.carIdxPittedLap[i]) {
            if (this.carIdxPitTime[i] > 0) {
                this.carIdxPitLastStopTime[i] = this.carIdxPitTime[i];
                this.carIdxPitTime[i] = 0;
            }
        }
    }

    private CheckSessionState (data: any) {
        // check for session change i.e. practice -> race
        if (this.CurrentSessionNum !== data.values.SessionNum) {
            // reset timing data
            this.carIdxCurrentLap = [];
            this.carIdxCurrentLapStartTime = [];
            this.carIdxLapTimes = [];
            this.carIdxPittedLap = [];
            this.carIdxPittedStart = [];
            this.carIdxPitTime = [];
            this.carIdxPitLapRecord = [];
            this.carIdxPitLastStopTime = [];
            this.carIdxStintRecord = [];
            // set current session num
            this.CurrentSessionNum = data.values.SessionNum;
        }
    }

    public IsActiveDriver (driverId: number): boolean {
        let activeDriver: boolean = false;
        for (let i = 0; i < this.Drivers.length; i++) {
            if (driverId === this.Drivers[i].UserID) {
                activeDriver = true;
                break;
            }
        }
        return activeDriver;
    }

    public SetDataFromSession (session: any) {
        if (this.Drivers !== session.data.DriverInfo.Drivers) {
            this.Drivers = session.data.DriverInfo.Drivers;
        }

        if (this.Sectors !== session.data.SplitTimeInfo.Sectors) {
            this.Sectors = session.data.SplitTimeInfo.Sectors;
        }
    }

    public GetTimingObjArray (data: any): object[] {
        this.CheckSessionState(data);

        let timingObjects = [];
        // process and send timing info
        if (this.Drivers.length > 0) {
            // process each active in session (non-spectating/non-dc) driver
            for (let i = 0; i < this.Drivers.length; i++) {
                if (this.Drivers[i].CarIsPaceCar === 0
                    && this.Drivers[i].IsSpectator === 0
                    && data.values.CarIdxPosition[i] > 0) {
                    this.OnNewLap(data, i);
                    this.OnPitLane(data, i);
                    timingObjects.push({
                        "Name": this.Drivers[i].TeamName,
                        "DriverName": this.Drivers[i].UserName,
                        "CarNum": this.Drivers[i].CarNumber,
                        "Position": data.values.CarIdxPosition[i],
                        "ClassPosition": data.values.CarIdxClassPosition[i],
                        "OnPitRoad": data.values.CarIdxOnPitRoad[i],
                        "ClassColour": "#" + this.Drivers[i].CarClassColor.toString(16),
                        "IRating": this.Drivers[i].IRating,
                        "LicString": this.Drivers[i].LicString,
                        "LicColor": "#" + this.Drivers[i].LicColor.toString(16),
                        "EstTime": data.values.CarIdxEstTime[i].toFixed(1),
                        "PitTime": this.carIdxPitTime[i].toFixed(1),
                        "PitLastTime": this.carIdxPitLastStopTime[i] ? this.carIdxPitLastStopTime[i].toFixed(1) : 0,
                        "PittedLap": this.carIdxPittedLap[i],
                        "CarLap": data.values.CarIdxLap[i],
                        "StintLength": this.carIdxStintRecord[i][this.carIdxStintRecord[i].length - 1],
                        "LastLap": this.carIdxLapTimes[i][this.carIdxLapTimes[i].length - 1],
                        "TrackSurf": data.values.CarIdxTrackSurface[i],
                        "Gap": this.carIdxGapInFront[i],
                        "DistDegree": 3.6 * (data.values.CarIdxLapDistPct[i] * 100)
                    });
                }
            }
            timingObjects.sort(
                (a, b) => (a.Position > b.Position) ? 1 : ((b.Position > a.Position) ? -1 : 0)
            );
        }
        return timingObjects;
    }
}
